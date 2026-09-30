---
slug: "spring-security-login-migration"
title: "수동 로그인에서 Spring Security 인증으로 옮기기"
description: "JSON 로그인 API에서 AuthenticationManager를 사용한 이유와 단위 테스트의 범위를 정리합니다."
publishedAt: "2025-11-25"
updatedAt: "2026-09-30"
category: "인증·보안"
tags: ["Spring","Security","Testing"]
draft: false
---

오늘은 기존에 직접 구현한 수동 로그인 로직을 Spring Security 기반으로 마이그레이션한 경험을 정리하려 한다.

아직 도메인을 완전히 맞추기 전이라 인증 방식은 JWT 기반으로 구성했다.

### 왜 Spring Security로 마이그레이션했는가?

이메일과 비밀번호를 직접 조회하고 비교하는 방식의 로그인 기능은 개발이 진행될수록 아래와 같은 문제가 생긴다.

- 비밀번호 암호화, 검증 로직을 직접 관리해야 함
- 계정 잠금/만료, 권한 체크, 비밀번호 정책 같은 기능을 전부 직접 작성해야 함
- OAuth2 연동을 붙이려면 구조를 대폭 수정해야 함
- 모든 인증/인가 관련 처리를 서비스 레이어에서 수행하기에 비즈니스 코드가 지저분해짐

Spring Security는 인증, 권한 관리, 비밀번호 암호화, 사용자 관리 기능을 이미 제공하므로 **기존 로직을 깔끔하게 정리하면서 확장성을 확보하기 위해** 마이그레이션을 결정했다.

## Spring Security란

먼저 Spring Security에 대해 알아보면 **인증, 권한 관리 그리고 데이터 보호 기능**을 포함하여 필수적인 사용자 관리 기능을 구현하는데 도움을 주는 Spring의 프레임워크이다.

### Spring Security 인증 흐름

Spring Security는 인증 과정을 아래 순서로 처리한다.

1. 사용자의 요청이 서버로 들어온다
2. Authentication Filter가 요청을 가로채고 AuthenticationManager에게 위임
3. AuthenticationManager는 등록된 AuthenticationProvider 목록을 확인
4. AuthenticationProvider는 UserDetailsService를 통해 사용자 조회
5. PasswordEncoder로 비밀번호 검증
6. 필터 기반 인증에서는 인증 성공 후 필터가 Authentication 객체를 SecurityContextHolder에 저장함

Spring Security의 핵심은 **AuthenticationManager가 인증을 직접 처리하지 않고 적절한 Provider에게 위임한다는 점**이다.

## 마이그레이션을 위해 필요한 구성 요소

이번 마이그레이션에서 내가 구현한 핵심 요소는 세 가지다.

1. `UserDetails` 를 구현한 `CustomUserPrincipal`
2. `UserDetailsService` 를 구현한 `CustomUserDetailsService`
3. `AuthenticationManager`에게 인증을 위임하는 로그인 서비스

이제 기존 수동 로그인에서 Spring Security를 사용하기 위해 내 자체 로그인 서비스인 `LocalAuthServiceImpl` 가 해야 할 일을 정리해보면

1. `AuthenticationManager`에게 `authenticate()`를 던진다.
2. Spring Security가 내부적으로

  - UserDetailsService 통해 유저 조회
  - PasswordEncoder로 비번 비교
3. 성공 시 `Authentication` 안에 `principal`로 User 정보가 들어옴
4. 거기서 `userId`를 꺼내서 토큰 발급

> **AuthenticationManager를 직접 주입한 이유**
>  기본적으로 Spring Security는 `UsernamePasswordAuthenticationFilter`에서 `AuthenticationManager.authenticate()`를 호출하고 인증 성공 시 `SuccessHandler`에서 후처리를 할 수 있다.
>  하지만 나는 폼 로그인 대신 JSON 기반 로그인 API를 사용하고 싶었고, 로그인 성공/실패 응답을 **완전히 내가 설계한 형식으로 반환**하고 싶었기 때문에 필터 방식 대신 **컨트롤러 → 서비스 레이어**에서 직접 `AuthenticationManager`를 주입받아 `authenticate()`를 호출하는 방식을 선택했다.
>  이렇게 하면 **Spring Security의 인증 파이프라인(UserDetailsService, PasswordEncoder 등)은 그대로 재사용하면서도** 로그인 과정 자체는 일반 서비스 로직처럼 다룰 수 있어 **테스트와 커스텀 로직 추가가 훨씬 수월**할 것이라 생각했다.

**CustomUserPrincipal**

```java
@Getter
public class CustomUserPrincipal implements UserDetails {

	private final Long id;
	private final String email;
	private final String password;
	private final Collection<? extends GrantedAuthority> authorities;

	public CustomUserPrincipal(User user) {
		this.id = user.getId();
		this.email = user.getEmail();
		this.password = user.getPassword();
		this.authorities = List.of(
			new SimpleGrantedAuthority(user.getUserRole().name())
		);
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return authorities;
	}

	@Override
	public @Nullable String getPassword() {
		return password;
	}

	@Override
	public String getUsername() {
		return email;
	}
}
```

**CustomUserDetailsService**

```java
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

	private final UserRepository userRepository;

	@Override
	public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
		User user = userRepository.findByProviderAndEmail(Provider.RECORDAY, email)
			.orElseThrow(() -> new UsernameNotFoundException("유저를 찾을 수 없습니다."));

		return new CustomUserPrincipal(user);
	}
}
```

이제 실제 로그인 로직에서는 직접 비밀번호를 비교하지 않고 `AuthenticationManager`에 인증 처리를 맡긴다.

**따라서 로그인 서비스는 비즈니스 로직만 담당하고, 비밀번호 인증을 Spring Security에 위임한다. 토큰 발급·검증과 이후 요청의 인증 처리는 별도로 구성해야 한다.**

**LocalSecurityAuthServiceImpl**

```java
@Service
@RequiredArgsConstructor
public class LocalSecurityAuthServiceImpl implements LocalAuthService {

	private final AuthenticationManager authenticationManager;
	private final JwtTokenService jwtTokenService;

	@Override
	public LocalLoginResponse login(LocalLoginRequest request) {
		try {
			Authentication authenticate = authenticationManager.authenticate(
				new UsernamePasswordAuthenticationToken(request.email(), request.password())
			);

			CustomUserPrincipal principal = (CustomUserPrincipal)authenticate.getPrincipal();
			Long userId = principal.getId();

			String accessToken = jwtTokenService.createAccessToken(userId);
			String refreshToken = jwtTokenService.createRefreshToken(userId);

			return new LocalLoginResponse(accessToken, refreshToken);
		} catch (BadCredentialsException e) {
			throw new BusinessException(AuthErrorCode.INVALID_CREDENTIALS);
		}
	}
}
```

## 단위 테스트

이제 기존 테스트 코드를 수정해서 Spring Security를 사용한 로그인 서비스의 단위 테스트를 진행한다.

아직 구현하지 않은 `JwtTokenService`와 빈 등록을 하지 않은 `AuthenticationManager`는 Mock 객체를 사용하고 `LocalSecurityAuthServiceImpl`에 주입했다.

**LocalSecurityAuthServiceImplTest**

```java
@ExtendWith(MockitoExtension.class)
class LocalSecurityAuthServiceImplTest {

	@Mock
	private AuthenticationManager authenticationManager;

	@Mock
	private JwtTokenService jwtTokenService;

	@InjectMocks
	private LocalSecurityAuthServiceImpl localSecurityAuthService;

	private LocalLoginRequest request;
	private CustomUserPrincipal principal;
	private Authentication authentication;

	@BeforeEach
	void setUp() throws Exception {
		String email = "test@example.com";
		String rawPassword = "1234";

		request = new LocalLoginRequest(email, rawPassword);
		User user = createLocalUser(email);

		principal = new CustomUserPrincipal(user);
		authentication = new UsernamePasswordAuthenticationToken(
			principal, null, principal.getAuthorities()
		);
	}

	@Test
	@DisplayName("Spring Security를 이용한 로그인 성공")
	void loginSuccess() {
		//given
		given(authenticationManager.authenticate(any(Authentication.class)))
			.willReturn(authentication);
		given(jwtTokenService.createAccessToken(principal.getId()))
			.willReturn("access-token");
		given(jwtTokenService.createRefreshToken(principal.getId()))
			.willReturn("refresh-token");

		//when
		LocalLoginResponse response = localSecurityAuthService.login(request);

		//then
		assertThat(response.accessToken()).isEqualTo("access-token");
		assertThat(response.refreshToken()).isEqualTo("refresh-token");

		then(authenticationManager).should().authenticate(any(Authentication.class));
		then(jwtTokenService).should().createAccessToken(principal.getId());
		then(jwtTokenService).should().createRefreshToken(principal.getId());
	}

	@Test
	@DisplayName("인증 실패 시 예외 발생")
	void loginFail_badCredentials() {
		//given
		given(authenticationManager.authenticate(any(Authentication.class)))
			.willThrow(new BadCredentialsException("bad credentials"));

		//then
		assertThatThrownBy(() -> localSecurityAuthService.login(request))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.INVALID_CREDENTIALS);

		then(authenticationManager).should().authenticate(any(Authentication.class));
		then(jwtTokenService).shouldHaveNoInteractions();
	}

	private User createLocalUser(String email) {
		return User.builder()
			.id(1L)
			.provider(Provider.RECORDAY)
			.userRole(UserRole.ROLE_USER)
			.email(email)
			.password("encoded")
			.username("테스트 유저")
			.profileUrl("https://example.com/profile.png")
			.build();
	}

}
```

## 마이그레이션 후 얻은 이점

이렇게 자체 로그인을 Spring Security로 마이그레이션 했는데 이 과정까지만 본다면 오히려 작성해야 할 코드가 늘어났고, 과정은 더 복잡해졌다고 느껴질 수 있다.

하지만 프로젝트 규모가 커질수록 Spring Security의 장점은 아주 크다.

1. 비밀번호 인증 로직을 Provider에 위임해 로그인 서비스의 책임을 줄임
2. OAuth2, 관리자 권한, 권한별 접근 제한 등을 쉽게 확장 가능
3. PasswordEncoder, Provider, FilterChain 등 안정성이 이미 검증됨
4. SecurityContextHolder로 글로벌 사용자 정보 접근 가능
5. 테스트 작성이 더 쉬워짐(인증 자체를 Mocking 가능)

## 검증한 것과 남은 것

위 테스트는 AuthenticationManager와 토큰 서비스를 Mock으로 대체합니다. 로그인 서비스가 인증을 위임하고, 반환된 사용자 정보로 토큰 생성을 요청하며, 인증 실패 시 토큰을 만들지 않는 흐름을 확인합니다. 실제 PasswordEncoder·Provider 빈 연결·JWT 검증이나 HTTP 요청 전체를 검증한 테스트는 아닙니다.

직접 authenticate()를 호출해 반환값을 받는 것만으로 SecurityContext 저장이나 다음 요청의 인증이 자동 해결되는 것은 아닙니다. JWT를 발급한 뒤 이어지는 요청에서 토큰을 검증하고 인증 정보를 구성하는 경로는 별도로 구현·검증해야 합니다.

## 참고 자료

- [Spring Security: DaoAuthenticationProvider](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/dao-authentication-provider.html)
