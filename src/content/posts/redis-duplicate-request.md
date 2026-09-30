---
slug: "redis-duplicate-request"
title: "AOP와 Redis로 이메일 인증 중복 요청 방지하기"
description: "인증번호가 덮어써지는 문제를 Redis와 AOP로 제어하고 장애 정책을 나눈 기록입니다."
publishedAt: "2025-12-17"
updatedAt: "2026-09-30"
category: "트러블슈팅"
tags: ["Spring","Redis","AOP"]
draft: false
---

> 2025.12.17에 작성한 [원문](https://velog.io/@popeye0618/Spring-Boot-AOP와-Redis를-활용한-API-중복-요청-방지-이메일-발송-트러블-슈팅)을 2026.09.30에 이관했습니다. 원문의 구현 과정과 코드 발췌를 보존했습니다. TTL 기반 요청 억제를 영구적인 멱등성 보장과 구분하도록 설명을 수정했습니다. 생략된 메서드가 있는 코드는 전체 실행 예제가 아닙니다.

## 1. 배경: “인증번호가 맞는데 왜 틀리다고 하죠?”

회원가입이나 비밀번호 찾기 기능에서 필수적인 이메일 인증 기능을 개발하던 중 QA 과정에서 간헐적으로 다음과 같은 이슈가 발생했다.

**사용자 시나리오**

1. 사용자가 '인증 메일 전송' 버튼을 클릭한다. (네트워크 지연 등으로 반응이 늦음)
2. 사용자가 조급한 마음에 버튼을 **빠르게 한 번 더 클릭**한다. (따닥!)
3. 서버에는 거의 동시에 **2개의 요청**이 들어간다.
4. 첫 번째 요청이 인증번호 `1111`을 생성하고 메일을 보낸다.
5. 두 번째 요청이 인증번호 `2222`로 덮어씌우고 메일을 보낸다.
6. 사용자는 먼저 도착한 메일(`1111`)을 보고 입력하지만 서버에는 이미 `2222`로 갱신되어 있어 **인증번호 불일치** 오류가 발생한다.

이 문제는 단순한 UX 불편을 넘어 서비스의 신뢰도를 떨어뜨리는 원인이 된다. 클라이언트에서 버튼을 비활성화하는 처리를 하더라도 네트워크 패킷 조작이나 의도적인 API 호출 등을 완벽히 막을 수는 없을 것이다.

따라서 **서버단에서 확실하게 중복 요청을 차단**하는 메커니즘이 필요했다.

## 2. 해결 전략: AOP와 Redis

이 기능을 비즈니스 로직 안에 직접 넣으면 코드가 지저분해지고 다른 API(예: 결제, 좋아요 등)에서 재사용하기 어려울 것이라고 생각했다.

따라서 관점 지향 프로그래밍(AOP)을 도입하여 **중복 방지**라는 관심사를 분리하기로 결정했다. 또한 분산 서버 환경을 고려하여 **Redis**를 활용해 락을 관리했다.

**핵심 아이디어**

1. **Unique Key 생성**: 요청한 사용자의 정보와 메서드를 조합해 고유 키를 만든다.
2. **Redis Atomic 연산**: `SETNX` 를 사용하여 키가 없을 때만 저장에 성공하게 한다.
3. **TTL 설정**: 지정된 시간 동안 키를 유지하여 그 시간 내의 추가 요청은 튕겨낸다.

## 3. 구현

### 3-1. 어노테이션 정의

먼저 중복 방지가 필요한 메서드에 붙일 마커 어노테이션 `@PreventDuplicateRequest` 를 정의했다. SpEL을 지원하여 요청 객체 내부의 특정 필드를 키로 사용할 수 있도록 했다.

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface PreventDuplicateRequest {

	String key() default "";

	long time() default 3000;

	TimeUnit timeUnit() default TimeUnit.MILLISECONDS;
}
```

- key: 중복 체크의 기준이 되는 키 (SpEL 지원)
- time: 중복 제한 시간 (기본 3초)
- timeUnit: 시간 단위 (기본 밀리초)

### 3-2. Aspect 구현 (DuplicateRequestAspect)

실제 로직을 처리하는 Aspect 구현. `StringRedisTemplate`을 사용하여 Redis와 통신한다.

```java
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class DuplicateRequestAspect {

    private final StringRedisTemplate redisTemplate;
    // SpEL 파싱을 위한 도구들
    private final ExpressionParser parser = new SpelExpressionParser();
    private final ParameterNameDiscoverer discoverer = new StandardReflectionParameterNameDiscoverer();

    @Around("@annotation(preventDuplicateRequest)")
    public Object checkDuplicate(ProceedingJoinPoint joinPoint, PreventDuplicateRequest preventDuplicateRequest) throws Throwable {
        // 1. 유니크 키 생성
        String uniqueKey = generateUniqueKey(joinPoint, preventDuplicateRequest.key());
        String redisKey = "duplicate:request:" + uniqueKey;

        long time = preventDuplicateRequest.time();
        TimeUnit unit = preventDuplicateRequest.timeUnit();

        // 2. Redis에 값 저장 시도 (Key가 없을 때만 성공)
        Boolean isSuccess = redisTemplate.opsForValue()
                .setIfAbsent(redisKey, "locked", Duration.ofMillis(unit.toMillis(time)));

        // 3. 이미 키가 존재하면(중복 요청) 예외 발생
        if (isSuccess == null || !isSuccess) {
            log.warn("중복 요청 차단됨 - Key: {}", redisKey);
            throw new BusinessException(GlobalErrorCode.DUPLICATE_REQUEST);
        }

        // 4. 최초 요청이면 원래 로직 수행
        return joinPoint.proceed();
    }

    // SpEL을 이용해 파라미터 값을 조합하여 Key를 생성하는 메서드
    private String generateUniqueKey(ProceedingJoinPoint joinPoint, String spelKey) {
        // (상세 구현 생략: MethodSignature 추출 및 SpEL 파싱 로직)
        return method.getName() + ":" + parsedValue;
    }
}
```

### 3-3. 적용 예시 (Controller)

```java
@PostMapping("/send-email")
@PreventDuplicateRequest(key = "#request.email", time = 5000)
public ResponseEntity<Void> sendAuthEmail(@RequestBody EmailRequest request) {
    emailService.sendAuthCode(request.getEmail());
    return ResponseEntity.ok().build();
}
```

## 4. 고찰: Redis 서버가 다운된다면? (Fail-Open vs Fail-Close)

이 기능을 구현하면서 한 가지 중요한 고민이 생겼다. **만약 Redis 서버가 장애로 인해 연결되지 않는다면 기능 전체가 동작하지 않도록 해야할까?**

`redisTemplate.opsForValue().setIfAbsent(...)` 호출 시 `RedisConnectionFailureException` 등이 발생할 수 있다.

이때 우리는 두 가지 선택지를 가진다.

### 선택지 1: Fail-Close

- **동작:** Redis 오류 발생 시 예외를 던져 요청을 막는다. (현재 코드 방식)
- **장점:** Redis 오류 시 요청 진행을 차단한다. TTL 만료를 포함한 모든 상황에서 중복 실행을 막는다는 뜻은 아니다. 이는 시스템의 정합성이 최우선일 때 선택해야 한다.
- **단점:** Redis 장애가 곧 서비스 장애로 이어진다.

### 선택지 2: Fail-Open

- **동작:** Redis 연결 실패 시 로그만 남기고 `joinPoint.proceed()`를 호출하여 요청을 허용한다.
- **장점:** Redis가 죽어도 서비스는 정상 작동한다. 이는 사용자 경험(UX) 측면에서 유리하다.
- **단점:** Redis 장애 기간 동안 중복 요청이 발생할 가능성이 열린다.

### 나의 선택과 결론

우리가 AOP를 활용하는 이유는 **비즈니스 로직의 오염 없이, 해당 기능을 여러 서비스 로직에서 사용하기 위함**이다. 현재 상황에서 Email 전송 API는 Fail-Open 방식이 좋아보이긴 한다. 하지만 추후 결제 서비스 등 허용하지 않아야 하는 서비스가 생길 수 있다.

따라서 **상황에 따라 다른 전략을 취하는 것**으로 결론짓고 리팩토링에 들어갔다.

## 5. 리팩토링

### 5-1. Enum 정의

먼저 어떤 정책을 사용할지 명시하기 위한 Enum을 만들었다.

```java
public enum LockStrategy {
	FAIL_CLOSE,
	FAIL_OPEN
}
```

### 5-2. 어노테이션 수정

어노테이션에 strategy 속성을 추가했다. 기본 값은 안전하게 `FAIL_CLOSE`로 설정했다.

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface PreventDuplicateRequest {

	String key() default "";

	long time() default 3000;

	TimeUnit timeUnit() default TimeUnit.MILLISECONDS;

	LockStrategy strategy() default LockStrategy.FAIL_CLOSE;
}
```

### 5-3. Aspect 로직 수정

이제 Redis 연결 오류가 발생했을 때 위에서 설정한 전략을 확인하도록 로직을 변경한다.

```java
@Around("@annotation(preventDuplicateRequest)")
	public Object checkDuplicate(ProceedingJoinPoint joinPoint, PreventDuplicateRequest preventDuplicateRequest) throws
		Throwable {
		String uniqueKey = generateUniqueKey(joinPoint, preventDuplicateRequest.key());
		String redisKey = "duplicate:request:" + uniqueKey;

		long time = preventDuplicateRequest.time();
		TimeUnit unit = preventDuplicateRequest.timeUnit();
		LockStrategy strategy = preventDuplicateRequest.strategy();

		try {
			Boolean isSuccess = redisTemplate.opsForValue()
				.setIfAbsent(redisKey, "locked", Duration.ofMillis(unit.toMillis(time)));

			if (isSuccess == null || !isSuccess) {
				log.warn("중복 요청 차단됨 - Key: {}", redisKey);
				throw new BusinessException(GlobalErrorCode.DUPLICATE_REQUEST);
			}

		} catch (Exception e) {
			if (e instanceof BusinessException) {
				throw e;
			}

			if (strategy == LockStrategy.FAIL_OPEN) {
				log.error("Redis 연결 실패 - Fail Open 정책에 의해 로직 실행 허용. Error: {}", e.getMessage());
			} else {
				log.error("Redis 연결 실패 - Fail Close 정책에 의해 로직 차단. Error: {}", e.getMessage());
				throw new BusinessException(GlobalErrorCode.REDIS_CONNECTION_ERROR);
			}

		}
		return joinPoint.proceed();
	}
```

- Fail Open 전략일 때는 런타임 예외를 던지지 않고 기존 메서드를 계속 진행시킨다.
- Fail Close 전략일 때는 런타임 예외를 던져 요청을 튕겨낸다.

### 5-4. 적용 예시 (Controller)

```java
@PostMapping("/send-email")
@PreventDuplicateRequest(key = "#request.email", time = 5000, strategy = LockStrategy.FAIL_OPEN)
public ResponseEntity<Void> sendAuthEmail(@RequestBody EmailRequest request) {
    emailService.sendAuthCode(request.getEmail());
    return ResponseEntity.ok().build();
}
```

## 6. 결론

이번 트러블 슈팅을 통해 다음과 같은 성과를 얻을 수 있었다.

1. **TTL 내 중복 요청 억제:** Redis Atomic 연산으로 동일 키의 후속 요청을 제한.
2. **관심사의 분리:** AOP를 도입하여 비즈니스 로직의 오염 없이 부가 기능을 모듈화.
3. **유연한 에러 처리:** `LockStrategy`를 도입하여 상황에 맞는 장애 대응 전략 수립.

비록 현재는 단일 서버 환경이지만 추후 트래픽 증가로 인한 스케일 아웃(Scale-out) 상황에서도 이 아키텍처는 유효할 것이다. 로컬 메모리가 아닌 외부 저장소(Redis)를 활용한 덕분에 서버가 아무리 늘어나도 **Stateless한 구조**를 유지하며 일관된 중복 방지 로직을 수행할 수 있다.

## 이관 시 보완: 중복 억제의 범위

이 구현은 동일 키가 살아 있는 시간 동안 후속 요청을 막습니다. 최초 요청이 TTL보다 오래 걸리면 키 만료 후 다른 요청이 진입할 수 있습니다. Redis 장애 시 Fail-Open을 선택하면 중복 요청이 통과할 수도 있습니다. 따라서 결제 등에 필요한 멱등성이나 정확히 한 번 실행을 이 코드만으로 보장한다고 말할 수 없습니다.

메일 전송이 실패해도 키는 TTL 동안 남으므로 재시도가 잠시 막힐 수 있습니다. 원문에는 동시 요청 수·TTL 경계·Redis 장애를 포함한 실행 결과가 없으므로, 다음 검증에서는 이 조건들을 분리해 확인해야 합니다. 키에는 API 구분과 정규화된 사용자 식별 기준을 포함하고, 개인정보 원문을 로그에 남기는 방식도 재검토해야 합니다.

## 참고 자료

- [최초 작성 글](https://velog.io/@popeye0618/Spring-Boot-AOP와-Redis를-활용한-API-중복-요청-방지-이메일-발송-트러블-슈팅)
- [Redis SET: NX와 만료 옵션](https://redis.io/docs/latest/commands/set/)
