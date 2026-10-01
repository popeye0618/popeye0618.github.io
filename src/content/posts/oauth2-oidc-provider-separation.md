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

기존 프로젝트의 소셜 로그인은 `OAuth 2.0` Authorization Code 흐름을 사용하고 있었다. 제공자의 사용자 정보를 우리 서비스 회원으로 연결하는 과정에서, OIDC가 제공하는 표준화된 신원 정보도 활용해보고자 했다.

OAuth 2.0은 인가를 위한 프레임워크이고, OIDC(OpenID Connect)는 그 위에 인증 계층을 더한다. OIDC에서는 `ID Token`과 표준 클레임으로 로그인한 사용자에 관한 정보를 전달받는다. 이 정보를 인증에 사용하려면 토큰 검증도 올바르게 구성되어 있어야 한다.

카카오는 OIDC로 연결하고, 네이버는 당시 구현의 OAuth 2.0 경로를 유지했다. 두 인증 경로를 나누면서도 회원 조회와 가입 처리는 공유하도록 정리한 과정을 기록한다.

## 2. 설계: 제공자별 인증과 공통 회원 처리

Spring Security는 `OAuth2User`와 `OidcUser` 인터페이스를 구분한다.

우리 서비스에서 회원을 조회하거나 가입시키는 처리는 두 경로에서 공통으로 사용할 수 있었다.

### 핵심 전략

1. **공통 사용자 타입:** `CustomOAuth2User`가 `OAuth2User`와 `OidcUser`를 동시에 구현하도록 했다.
2. **회원 처리 분리:** `CustomOAuth2UserService`와 `CustomOidcUserService`가 공통 회원 처리를 `SocialLoginService`에 위임하게 했다.
3. **제공자 응답 매핑:** `ProviderUser` 인터페이스와 팩토리로 응답 형식의 차이를 모았다. 제공자를 추가할 때 공통 회원 처리 코드의 변경을 줄이는 것이 목적이었다.

### 아키텍처 흐름도

- Kakao (`scope: openid` O) → `CustomOidcUserService` → `SocialLoginService`
- Naver (`scope: openid` X) → `CustomOAuth2UserService` → `SocialLoginService`

## 3. 구현 과정

### 3-1. application.yml 설정

Spring Security의 OAuth2 Login에서는 `openid` scope를 통해 OIDC 경로를 사용한다. 아래는 두 등록의 scope 차이를 보여주는 설정 일부다. 실제 연동에는 제공자 엔드포인트, 클라이언트 인증 방식, 리다이렉트 URI 등의 설정도 필요하다.

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

### 3-2. CustomOAuth2User로 공통 타입 구성

당시에는 로그인 성공 후 우리 서비스의 사용자 정보를 공통으로 다루기 위해 두 인터페이스를 함께 구현했다. 아래는 생성자와 일부 메서드를 생략한 코드다. 이 선택에는 OIDC 계약을 확인해야 하는 지점도 있어, 뒤에서 함께 정리한다.

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

두 UserService에서 반복되던 회원 처리를 `SocialLoginService`로 모았다. 제공자 응답을 `ProviderUser`로 변환하고, 회원을 조회하거나 등록한 뒤 principal을 반환한다. 아래 코드는 흐름을 설명하기 위한 발췌로, `provider`를 구하는 부분과 생성자 인자 등은 생략했다.

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

### 네이버 연동에서 겪은 속성 매핑 오류

당시 네이버도 OIDC 경로로 연결하려고 시도했지만, `user-name-attribute: sub`를 설정한 상태에서 `Attribute value cannot be null` 오류가 발생했다.

확인한 사용자 정보 응답은 `{ "response": { "id": ... } }` 형태의 중첩 JSON이었다. 당시에는 이 응답 구조와 속성 매핑의 차이가 원인이라고 판단했다. 다만 오류 메시지와 응답 구조만으로 `StandardClaimAccessor`가 정확한 발생 지점이었다고 확정할 수는 없다. 사용한 Discovery 설정과 제공자의 지원 범위, 스택 트레이스를 함께 확인해야 한다.

이 구현에서는 네이버의 OAuth 2.0 경로를 유지했다. 두 제공자의 처리 방식을 분리하면 네이버 연동에 필요한 매핑을 해당 경로 안에서 다루면서 공통 회원 처리는 그대로 사용할 수 있다고 판단했다.

## 5. 느낀 점과 남은 확인 사항

카카오 OIDC 경로에서는 ID Token과 표준 클레임을 기준으로 사용자 정보를 다룰 수 있었다. 제공자별 인증 경로를 나눈 뒤에도 회원 조회와 가입 처리를 공유할 수 있다는 점이 이번 정리에서 얻은 부분이다.

공통 principal 타입은 다시 살펴볼 여지가 있다. `CustomOAuth2User`가 두 인터페이스를 함께 구현하더라도, 일반 OAuth2 로그인에서는 `idToken`이 없고 예시의 `getClaims()`는 빈 맵을 반환한다. 이 객체를 `OidcUser`로 사용하는 코드가 ID Token을 기대한다면 문제가 생길 수 있다. 호출 측을 확인하고 필요하면 principal 타입을 나누되 회원 매핑 로직을 공유하는 구성을 검토해야 한다.

또한 여기의 코드는 사용자 매핑 구조를 설명한다. 실제 연동이 끝났는지 확인하려면 제공자별 설정, ID Token 검증, principal로 전달되는 클레임까지 함께 살펴봐야 한다.

## 참고 자료

- [Spring Security 6.5: OAuth2 Login 고급 설정](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/login/advanced.html)
