---
slug: "redis-duplicate-request"
title: "AOP와 Redis로 이메일 인증 중복 요청 방지하기"
description: "인증번호가 덮어써지는 문제를 Redis와 AOP로 제어하고 장애 정책을 나눈 기록입니다."
publishedAt: "2025-12-17"
updatedAt: '2026-09-30'
category: "트러블슈팅"
tags: ["Spring","Redis","AOP"]
draft: false
---

## 1. 배경: “인증번호가 맞는데 왜 틀리다고 하죠?”

회원가입과 비밀번호 찾기에 쓰는 이메일 인증 기능을 개발하던 중, QA에서 인증번호를 맞게 입력해도 불일치 오류가 나는 경우를 확인했다.

**사용자 시나리오**

1. 사용자가 '인증 메일 전송' 버튼을 클릭한다. (네트워크 지연 등으로 반응이 늦음)
2. 응답을 기다리던 사용자가 버튼을 **빠르게 한 번 더 클릭**한다.
3. 서버에는 거의 동시에 **2개의 요청**이 들어간다.
4. 첫 번째 요청이 인증번호 `1111`을 생성하고 메일을 보낸다.
5. 두 번째 요청이 인증번호 `2222`로 덮어씌우고 메일을 보낸다.
6. 사용자는 먼저 도착한 메일(`1111`)을 보고 입력하지만 서버에는 이미 `2222`로 갱신되어 있어 **인증번호 불일치** 오류가 발생한다.

클라이언트에서 전송 버튼을 비활성화할 수 있지만, API를 직접 호출하는 요청까지 제한하지는 못한다.

서버에서도 같은 이메일로 짧은 시간 안에 들어온 요청을 제한해, 인증번호가 연달아 덮어써지는 상황을 줄이기로 했다.

## 2. 해결 전략: AOP와 Redis

중복 요청 확인을 이메일 전송 로직마다 넣는 대신, 어노테이션으로 적용할 수 있도록 AOP로 분리했다. 요청을 제한하는 키는 Redis에 저장해 이후 서버가 여러 대로 늘어나도 같은 저장소를 참조하도록 했다.

여기서 구현한 것은 일정 시간 동안 같은 키의 요청을 억제하는 방식이다. 최초 요청의 완료까지 추적하는 락이나 처리 결과를 재사용하는 멱등성 저장소는 구현하지 않았다.

**핵심 아이디어**

1. **Unique Key 생성**: 요청한 사용자의 정보와 메서드를 조합해 고유 키를 만든다.
2. **조건부 저장과 만료 설정**: `setIfAbsent()`에 만료 시간을 전달해 키가 없을 때만 저장하고 TTL을 함께 설정한다. Redis의 `SET` 명령에 `NX`와 만료 옵션을 주는 방식이다.
3. **후속 요청 제한**: 키가 유지되는 동안 같은 키로 들어온 요청을 거절한다.

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

Aspect에서는 `StringRedisTemplate`으로 키 저장을 시도한다. 저장에 성공한 요청만 원래 메서드를 실행한다. `generateUniqueKey()`는 SpEL 처리 흐름을 생략한 발췌이므로 이 코드만으로 바로 실행할 수는 없다.

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

중복 요청을 제한한 뒤에는 Redis 연결에 실패했을 때 이메일 전송 요청도 함께 막을지 고민했다.

`redisTemplate.opsForValue().setIfAbsent(...)` 호출 시 `RedisConnectionFailureException` 등이 발생할 수 있다.

이때 우리는 두 가지 선택지를 가진다.

### 선택지 1: Fail-Close

- **동작:** Redis 오류 발생 시 예외를 던져 요청을 막는다. (현재 코드 방식)
- **판단 기준:** 중복 여부를 확인할 수 없을 때 요청을 진행시키지 않는다. 다만 TTL 만료 뒤의 재진입까지 막는 것은 아니므로, 이 정책만으로 처리의 정합성을 보장하지는 않는다.
- **단점:** Redis 장애가 곧 서비스 장애로 이어진다.

### 선택지 2: Fail-Open

- **동작:** Redis 연결 실패 시 로그만 남기고 `joinPoint.proceed()`를 호출하여 요청을 허용한다.
- **장점:** 중복 확인에 사용하는 Redis에 장애가 나더라도 원래 메서드의 실행은 허용할 수 있다. 이메일 전송 등 이후 로직의 성공 여부는 해당 로직의 의존성에 달려 있다.
- **단점:** Redis 장애 기간 동안 중복 요청이 발생할 가능성이 열린다.

### 나의 선택과 결론

이메일 전송 API에서는 Redis 연결 실패만으로 요청을 막기보다 전송을 시도하는 Fail-Open을 선택했다. 다른 API에 적용할 때는 요청을 허용했을 때의 위험이 다를 수 있으므로, 장애 정책을 어노테이션에서 선택할 수 있도록 바꾸기로 했다.

예를 들어 결제에 적용하려면 Fail-Close 선택뿐 아니라 요청과 처리 결과의 영속 저장, DB 제약 조건 등 별도의 중복 처리 방지 설계가 필요하다.

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

어노테이션에 `strategy` 속성을 추가했다. 별도 지정이 없으면 Redis 오류 시 요청을 막도록 기본값을 `FAIL_CLOSE`로 설정했다.

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

- Fail-Open이면 Redis 처리 예외를 기록한 뒤 원래 메서드를 실행한다.
- Fail-Close이면 `REDIS_CONNECTION_ERROR`로 변환해 요청을 막는다.
- 이미 중복으로 판단해 던진 `BusinessException`은 정책과 관계없이 다시 던진다.

이 예시는 `Exception`을 넓게 잡기 때문에 연결 실패 이외의 오류도 같은 정책으로 처리한다. 실제 적용 시에는 정책을 적용할 Redis 예외 범위를 좁히고, 만료 시간이나 Redis 사용 방식의 오류가 연결 장애로 오인되지 않는지 확인할 필요가 있다.

### 5-4. 적용 예시 (Controller)

```java
@PostMapping("/send-email")
@PreventDuplicateRequest(key = "#request.email", time = 5000, strategy = LockStrategy.FAIL_OPEN)
public ResponseEntity<Void> sendAuthEmail(@RequestBody EmailRequest request) {
    emailService.sendAuthCode(request.getEmail());
    return ResponseEntity.ok().build();
}
```

## 6. 적용 범위와 남은 검증

이메일 인증번호가 연속 요청으로 덮어써지는 문제에 대응하면서 세 가지를 분리했다. 요청을 구분하는 키, 키를 유지하는 시간, Redis 오류가 났을 때의 처리 정책이다. AOP로 묶어두어 이메일 전송 코드에서는 어노테이션으로 이 기준을 지정할 수 있게 했다.

현재는 단일 서버 환경이다. 여러 서버가 같은 Redis와 키 규칙을 사용하면 요청 제한 상태를 공유할 수 있다. 다중 서버에서 이 방식을 적용할 때도 공통 저장소와 일관된 키 규칙이 전제되어야 한다.

이 구현의 제한도 함께 남겨둔다.

- 최초 요청이 TTL보다 오래 걸리면 키 만료 후 다른 요청이 들어올 수 있다.
- Redis 장애 시 Fail-Open을 선택한 요청은 중복 확인 없이 실행될 수 있다.
- 이메일 전송이 실패해도 키는 TTL 동안 남아 재시도가 잠시 막힐 수 있다.
- 동시 요청, TTL 만료 전후, Redis 장애를 나누어 확인해야 한다.
- 키에는 API를 구분할 값과 정규화된 사용자 식별 기준이 필요하다. 예시처럼 키 전체를 로그에 남기면 이메일 등 개인정보가 기록될 수 있으므로 로그 방식도 조정해야 한다.

요청을 제한하는 시간을 정하는 것과 업무 처리가 중복되지 않도록 보장하는 것은 각각 확인할 부분이 있다. 이 글의 코드는 이메일 전송 요청을 짧은 시간 동안 억제하는 범위로 이해해야 한다.

## 참고 자료

- [Redis SET: NX와 만료 옵션](https://redis.io/docs/latest/commands/set/)
