# 천승환 · Portfolio & Blog

Astro + TypeScript 기반의 정적 포트폴리오와 Markdown 블로그입니다. 홈, 프로젝트, 이력, 블로그를 제공합니다.

## 실행

Node 24, pnpm 10.18.3 기준입니다.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm check
pnpm build
pnpm preview
```

검색은 `pnpm build`로 만든 Pagefind 인덱스가 필요합니다. 검색 확인에는 `pnpm preview`를 사용합니다.

## 글 작성

```sh
pnpm new:post my-new-post
```

`src/content/posts`의 생성된 Markdown에 제목·요약·날짜·카테고리·태그·본문을 작성합니다. 이미지는 `public/images/posts/<slug>/`에 넣고 `/images/posts/<slug>/image.png`로 참조합니다. 이미지에는 대체 텍스트를 작성합니다.

- `draft: false`이고 한국 시간 기준 발행일에 도달한 글만 공개됩니다.
- 초안은 공개 사이트의 경로·RSS·검색·사이트맵에서 제외됩니다. **공개 Git 저장소에 있는 초안 원문은 비공개가 아닙니다.** 민감한 메모를 저장하지 마세요.
- 미래 글은 날짜가 지나도 재빌드가 필요합니다. 자동 예약 빌드는 제공하지 않습니다.
- 로컬에서 글을 미리 볼 때만 `draft: false`로 바꾸고, 아직 게시하지 않을 글은 커밋 전에 `true`로 복원합니다.
- `slug`는 제목을 바꿔도 유지합니다. 중복·예약 슬러그와 잘못된 관련 프로젝트 참조는 빌드에서 차단됩니다.
- 시리즈는 `series`, `seriesTitle`, `seriesOrder`를 함께 지정합니다. 관련 프로젝트는 `relatedProjects: [comatching]`처럼 지정합니다.
- 카테고리·태그·시리즈 페이지는 공개 글에 따라 자동 생성됩니다. 목록은 10개 단위로 나뉩니다.
- 수정 시 `updatedAt: 'YYYY-MM-DD'`를 추가합니다. 발행일을 임의로 바꾸지 않습니다.

## 콘텐츠 수정

- 프로젝트: `src/content/projects` Markdown. 성과 값·조건·출처는 frontmatter에서 함께 관리합니다.
- 프로필·경력: `src/data/profile.ts`. 미확인 날짜·직함은 추가하지 않습니다.
- 기존 콘텐츠와 URL 이관: [이관 기록](docs/migration.md).

## 배포와 복구

GitHub Pages는 **Deploy from a branch → gh-pages → / (root)**로 설정되어 있습니다. 로컬에서 검사·빌드한 `dist`를 `gh-pages`에 게시하며, 별도 유료 호스팅은 사용하지 않습니다. 소스 브랜치의 Actions는 검사만 수행하며 사이트를 덮어쓰지 않습니다.

```sh
pnpm test
pnpm check
pnpm build
node scripts/publish-pages.mjs
```

게시 스크립트는 현재 소스가 커밋된 상태인지 확인하고, 기존 `gh-pages` 이력을 이어서 빌드 결과를 push합니다. 소스 변경도 별도로 소스 브랜치에 push해야 합니다. 위 검사를 모두 통과한 뒤 실행하세요. GitHub 계정 상태로 사용자 정의 Actions가 실행되지 않는 경우에도 로컬 검증과 브랜치 기반 Pages 배포를 사용할 수 있습니다.

사이트 주소는 `https://popeye0618.github.io`입니다. 사용자 사이트이므로 저장소 이름을 base 경로로 추가하지 않습니다.

기존 사이트 기준 커밋: `517283217b82abfca2227be2f7ae0fd9c2d9edcc`. 복구는 문제 소스 변경을 revert하고 다시 검사·빌드·게시하는 방식으로 수행합니다. `gh-pages`의 이전 커밋에도 게시 산출물이 보존됩니다. 기존 HTML 사이트로 복구할 때는 기준 커밋의 파일과 기존 Pages 배포 설정을 함께 복원해야 합니다.
