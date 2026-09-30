---
slug: "oauth2-oidc-provider-separation"
title: "카카오 OIDC와 네이버 OAuth2 로그인 전략 분리하기"
description: "소셜 로그인 제공자별 처리와 공통 회원 로직을 분리한 설계 경험입니다."
publishedAt: "2025-12-08"
updatedAt: '2026-09-30'
category: "인증·보안"
tags: ["Spring","Security","OAuth2","OIDC"]
draft: false
---

## 1. 들어가며: 왜 OIDC인가?

기존 프로젝트는 `OAuth 2.0` Authorization Code 방식을 사용하여 소셜 로그인을 구현하고 있었다. 하지만 OAuth 2.0은 본래 인가(Authorization)를 위한 프로토콜이지 인증(Authentication)을 위한 표준은 아니다.

반면, OIDC(OpenID Connect)는 OAuth 2.0 위에 구축된 **신원 확인(Identity) 프로토콜이**다. `ID Token(JWT)`을 통해 사용자의 신원을 바로 검증할 수 있고 표준화된 사용자 정보(Standard Claims)를 제공받을 수 있다는 장점이 있다.

이번 글에서는 **OIDC를 지원하는 제공자(Kakao)는 OIDC로**, **네이버는 당시 구현에서 OAuth 2.0으로** 구현하여 하나의 프로젝트에서 두 방식이 공존하는 **하이브리드 아키텍처**를 리팩터링한 과정을 공유해본다.

## 2. 설계: 공존을 위한 아키텍처 (SOLID)

Spring Security는 `OAuth2User`와 `OidcUser` 인터페이스를 구분한다.

하지만 우리 서비스의 도메인 로직(회원가입, 로그인)은 로그인 방식에 상관없이 동일해야 한다.

### 핵심 전략

1. **공통 사용자 타입:** `CustomOAuth2User`가 `OAuth2User`와 `OidcUser`를 동시에 구현하도록 했다.
2. **SRP (단일 책임 원칙):** 회원가입 및 사용자 처리 로직은 `SocialLoginService`로 분리하고 `UserService`들은 단순히 위임만 한다.
3. **OCP (개방-폐쇄 원칙):** `ProviderUser` 인터페이스와 팩토리 패턴을 사용하여 새로운 소셜 로그인이 추가되어도 기존 로직을 수정하지 않게 설계한다.

### 아키텍처 흐름도

- Kakao (`scope: openid` O) → `CustomOidcUserService` → `SocialLoginService`
- Naver (`scope: openid` X) → `CustomOAuth2UserService` → `SocialLoginService`

## 3. 구현 과정

### 3-1. application.yml 설정

Spring Security는 `scope`에 `openid` 포함 여부로 OIDC 사용을 결정한다.

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          # 1. 카카오 (OIDC 적용)
          kakao:
            client-id: ${KAKAO_CLIENT_ID}
            scope:
              - openid
              - profile_nickname
              - account_email
            client-name: Kakao

          # 2. 네이버 (OAuth2 적용)
          naver:
            client-id: ${NAVER_CLIENT_ID}
            scope:
              - name
              - email
            # openid를 제외하여 일반 OAuth2 흐름을 타게 함
            client-name: Naver
```

### 3-2. CustomOAuth2User (다형성 확보)

OIDC 로그인 시에는 `idToken` 클레임 정보가 필수적이므로 두 인터페이스를 모두 구현한다.

```java
@Getter
public class CustomOAuth2User extends CustomUserPrincipal implements OAuth2User, OidcUser {
    private final OidcIdToken idToken;
    private final OidcUserInfo userInfo;

    // ... 생성자 생략 ...

    @Override
    public Map<String, Object> getClaims() {
        // OIDC 로그인일 경우 ID Token Claims 반환
        return this.idToken != null ? this.idToken.getClaims() : Map.of();
    }
}
```

### 3-3. 서비스 레이어 분리 (SocialLoginService)

중복 코드를 방지하기 위해 비즈니스 로직을 중앙화.

```java
@Service
@RequiredArgsConstructor
public class SocialLoginService {

    private final UserRepository userRepository;

    @Transactional
    public CustomOAuth2User processUser(ClientRegistration clientRegistration, OAuth2User oAuth2User) {
        // 1. Factory를 통해 Provider별 데이터 정규화 (Adapter Pattern)
        ProviderUser providerUser = ProviderUserFactory.of(provider, oAuth2User, clientRegistration);

        // 2. 회원가입 or 조회 로직
        User user = findOrRegister(provider, providerUser);

        // 3. OIDC 여부에 따라 적절한 CustomOAuth2User 생성
        if (oAuth2User instanceof OidcUser oidcUser) {
            return new CustomOAuth2User(user, ..., oidcUser.getIdToken());
        }
        return new CustomOAuth2User(user, ...);
    }
}
```

## 4. 트러블 슈팅

### 네이버의 OIDC 호환성 문제

당시 네이버도 OIDC로 연결하려고 시도했다. 이때 사용한 Discovery 설정과 제공자의 지원 범위는 추가 확인이 필요하다.

하지만 `user-name-attribute: sub` 설정을 했음에도 `Attribute value cannot be null` 에러가 발생했다.

- **당시 원인으로 판단한 내용:** 네이버 UserInfo API 응답은 표준 Flat 구조가 아니라 `{ "response": { "id": ... } }` 형태의 중첩 JSON이었다. Spring Security의 엄격한 OIDC 검증 로직(`StandardClaimAccessor`)이 이를 파싱하지 못했다.
- **해결:** 네이버는 과감하게 OAuth 2.0 방식을 유지하기로 결정했다. 당시 네이버 연동을 위해 억지로 커스텀 코드를 늘리는 것보다 전략을 분리하는 것이 유지보수에 유리하다고 판단했다.

## 5. 느낀점

확실히 id-token을 사용해서 인증까지 바로 진행되니 사용자 인증을 구현하는데 훨씬 간편해졌다.

또한 Standard Claims 형식이 정해져있어 OAuth2 공급자에 대한 어댑터를 구현하기도 쉬워졌다.

## 인증 경로를 분리하며 확인한 점

당시 구성에서는 네이버 로그인 시 `Attribute value cannot be null` 오류를 겪었고 OAuth2 경로를 유지하기로 했습니다. 정확한 발생 지점을 좁히려면 사용자 정보 응답과 속성 매핑, Discovery 설정을 함께 확인해야 했습니다.

Spring Security는 OAuth2UserService와 OidcUserService를 각각 설정할 수 있습니다. 공통 회원 처리 로직으로 연결하되, OIDC principal은 ID Token과 클레임 계약을 유지해야 합니다. 두 인터페이스를 함께 구현했다는 사실만으로 리스코프 치환 원칙을 만족하는 것은 아닙니다. 위 예시처럼 일반 OAuth2 사용자에 null ID Token을 허용한다면 호출 측의 계약을 확인하고, 필요하면 principal 타입은 나누고 도메인 매핑만 공유하는 방식을 검토할 수 있습니다.

실제 연동에서는 사용자 매핑 코드 외에도 제공자 엔드포인트, 클라이언트 인증 방식, 리다이렉트 URI를 함께 설정해야 합니다. OIDC 경로는 ID Token의 검증과 클레임 전달까지 확인하는 것이 필요합니다.

## 참고 자료

- [Spring Security 6.5: OAuth2 Login 고급 설정](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/login/advanced.html)
