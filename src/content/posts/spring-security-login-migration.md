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

기존에 직접 구현했던 이메일·비밀번호 로그인을 Spring Security의 인증 흐름으로 옮겼다. 이 글은 JSON 로그인 API에서 인증을 위임하고, 성공한 사용자의 ID로 JWT 발급을 요청하도록 바꾼 과정이다.

### 왜 Spring Security로 마이그레이션했는가?

직접 만든 로그인 서비스에서 사용자 조회와 비밀번호 검증을 함께 처리하고 있었다. 인증 기능을 확장하기 전에 다음 책임을 어디에 둘지 정리할 필요가 있었다.

- 사용자 조회와 비밀번호 검증을 로그인 서비스에서 얼마나 직접 처리할지
- 계정 상태 확인과 권한별 접근 제한을 어떻게 확장할지
- 이후 OAuth2 로그인을 연결할 때 인증 관련 코드를 어떻게 구성할지

Spring Security가 제공하는 인증 구성 요소를 사용해 로그인 서비스의 책임을 줄이기로 했다. 계정 상태나 비밀번호 정책이 모두 자동으로 완성되는 것은 아니지만, 인증에 필요한 조회와 검증을 정해진 확장 지점에 연결할 수 있었다.

## Spring Security란

Spring Security는 인증과 인가 등을 구성하는 보안 프레임워크다. 이번에는 그중 사용자 조회와 비밀번호 검증을 담당하는 흐름을 사용했다.

### Spring Security 인증 흐름

필터 기반 로그인에서 `ProviderManager`와 `DaoAuthenticationProvider`를 사용하는 경우를 단순화하면 다음과 같다.

1. 로그인 요청이 서버로 들어온다.
2. 인증 필터가 인증 요청을 `AuthenticationManager`에 위임한다.
3. 구현체인 `ProviderManager`가 요청을 처리할 수 있는 `AuthenticationProvider`를 찾는다.
4. `DaoAuthenticationProvider`가 `UserDetailsService`로 사용자를 조회한다.
5. `PasswordEncoder`로 비밀번호를 검증한다.
6. 인증 성공 후 필터가 반환된 `Authentication`을 `SecurityContextHolder`에 저장한다.

`AuthenticationManager`는 인증 진입점을 나타내는 인터페이스다. 일반적으로 사용하는 구현체인 `ProviderManager`가 요청을 처리할 수 있는 `AuthenticationProvider`에 위임한다. 사용자 조회와 비밀번호 검증은 `DaoAuthenticationProvider`가 `UserDetailsService`와 `PasswordEncoder`를 사용해 수행한다.

## 마이그레이션을 위해 필요한 구성 요소

이번 마이그레이션에서 내가 구현한 핵심 요소는 세 가지다.

1. `UserDetails` 를 구현한 `CustomUserPrincipal`
2. `UserDetailsService` 를 구현한 `CustomUserDetailsService`
3. `AuthenticationManager`에게 인증을 위임하는 로그인 서비스

로그인 서비스는 이메일과 비밀번호를 담은 인증 객체로 `authenticate()`를 호출한다. 인증에 성공하면 반환된 principal에서 `userId`를 꺼내 토큰 발급을 요청한다.

### AuthenticationManager를 서비스에서 호출한 이유

기본 폼 로그인 흐름에서는 `UsernamePasswordAuthenticationFilter`가 인증을 요청하고, 성공 후 `SuccessHandler`에서 후처리를 할 수 있다.

나는 JSON 기반 로그인 API와 직접 정한 성공·실패 응답 형식을 사용하고 싶었다. 그래서 컨트롤러에서 호출하는 서비스에 `AuthenticationManager`를 주입했다. 사용자 조회와 비밀번호 검증은 Spring Security에 맡기고, 인증 결과를 응답과 토큰 발급으로 연결하는 부분은 서비스에서 다루기로 했다.

JSON 로그인을 필터로 구현할 수도 있다. 이번에는 서비스의 흐름을 단위 테스트로 확인하고 후처리를 추가하기 편하다고 판단해 이 방식을 선택했다.

### CustomUserPrincipal

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

### CustomUserDetailsService

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

로그인 서비스에는 인증 요청, 토큰 발급 요청, 응답 생성과 예외 변환이 남는다. 토큰 검증과 이후 HTTP 요청에서 인증 정보를 구성하는 작업은 별도로 구현해야 한다.

### LocalSecurityAuthServiceImpl

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

기존 테스트를 수정해 로그인 서비스의 위임과 후처리 흐름을 확인했다. 이 단계에서는 `JwtTokenService` 구현과 `AuthenticationManager` 빈 등록이 완료되지 않아 두 의존성을 Mock으로 대체했다. 따라서 아래 테스트의 대상은 `LocalSecurityAuthServiceImpl`이다.

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

## 마이그레이션에서 달라진 점

구성 요소를 나누면서 작성할 코드는 늘었다. 이번 변경에서 가장 분명한 차이는 로그인 서비스가 사용자 조회와 비밀번호 비교를 직접 수행하지 않게 되었다는 점이다.

사용자 조회는 `CustomUserDetailsService`로, 비밀번호 검증은 Spring Security의 Provider로 책임을 옮겼다. 서비스 테스트에서는 인증 결과를 Mock으로 주어 토큰 발급과 예외 변환 흐름을 따로 확인할 수 있었다. 이후 인증 방식을 추가할 때도 공통으로 사용할 부분과 방식마다 달라지는 부분을 구분할 기준이 생겼다.

## 검증한 것과 남은 것

위 단위 테스트로 확인한 내용은 다음과 같다.

- 로그인 서비스가 `AuthenticationManager`에 인증을 요청한다.
- 인증에 성공하면 반환된 principal의 ID로 access token과 refresh token 생성을 요청한다.
- `BadCredentialsException`이 발생하면 지정한 업무 예외로 변환하고 토큰을 생성하지 않는다.

반면 실제 `PasswordEncoder`의 검증, Provider와 빈 연결, JWT 발급·검증, HTTP 요청 전체의 인증 흐름은 이 테스트에서 확인하지 않았다.

또한 서비스에서 `authenticate()`의 반환값을 받는 것만으로 `SecurityContext` 저장이나 다음 요청의 인증까지 완료되지는 않는다. 발급한 JWT를 다음 요청에서 검증하고 인증 정보를 구성하는 경로는 별도로 구현하고 통합 테스트로 확인해야 한다.

## 참고 자료

- [Spring Security: DaoAuthenticationProvider](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/dao-authentication-provider.html)
