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

이 블로그는 관리자 화면 대신 **Markdown 파일을 Git으로 관리**합니다. 새 파일에 글을 작성하고 사이트를 빌드·배포하면 목록·검색·태그·RSS에 자동으로 반영됩니다.

### 1. 새 글 파일 만들기

포트폴리오 저장소 폴더에서 실행합니다. `my-new-post`는 글 주소에 사용할 영문 소문자와 하이픈 조합입니다.

```sh
node scripts/new-post.mjs my-new-post
```

`pnpm new:post my-new-post`도 같은 명령입니다. 스크립트는 아래 두 경로를 만들며, 같은 이름의 글이 있으면 덮어쓰지 않습니다.

- `src/content/posts/my-new-post.md`: 본문과 메타데이터
- `public/images/posts/my-new-post/`: 본문 이미지 보관 폴더

### 2. 메타데이터와 본문 작성하기

생성한 Markdown을 편집합니다. 파일 위쪽 `---` 사이가 메타데이터이며, 그 아래가 본문입니다.

```markdown
---
slug: my-new-post
title: '내가 해결한 문제의 제목'
description: '어떤 문제를 어떻게 해결했는지 한 문장으로 설명합니다.'
publishedAt: '2026-09-30'
category: 프로젝트 기록
tags: [Spring, MySQL]
relatedProjects: [comatching]
draft: true
---

## 문제를 발견한 계기

어떤 상황에서 무엇이 불편했는지 적습니다.

## 원인과 구현

확인한 코드, 선택한 방법과 그 이유를 적습니다.

![변경 전후 조회 흐름](/images/posts/my-new-post/query-flow.png)

## 결과와 다음 확인할 점

측정 조건과 결과, 남은 문제를 적습니다.
```

날짜는 실제 작성일에 맞춥니다. 스크립트는 한국 시간 기준 오늘 날짜를 넣습니다. 관련 프로젝트가 없으면 `relatedProjects: []`로 두고, 연결하려면 `comatching`, `comatching-fc`, `harucut` 중 선택합니다. 카테고리와 태그는 새 값을 적어도 자동으로 분류 페이지가 생깁니다.

본문의 `##`·`###` 제목은 목차로 연결됩니다. 코드 블록에는 `java`, `sql`처럼 언어를 지정하면 강조와 복사 버튼이 제공됩니다. 이미지 파일은 생성된 이미지 폴더에 넣고 위 예시처럼 `/images/posts/...` 주소로 연결합니다.

시리즈를 구성하려면 메타데이터에 다음 항목을 추가합니다. 같은 시리즈의 글은 `series`와 `seriesTitle`을 같게 하고 `seriesOrder`를 중복 없이 지정합니다.

```yaml
series: my-series
seriesTitle: 나의 개발 기록
seriesOrder: 1
```

### 3. 미리보기와 공개 설정

현재 미리보기도 공개 조건을 적용합니다. 내용을 확인할 때는 `draft: false`와 오늘 또는 과거 날짜를 사용합니다. 작성 중인 글은 확인 후 `draft: true`로 복원하고, 공개할 준비가 되면 `false`로 확정합니다.

```sh
pnpm dev
```

터미널에 표시된 로컬 주소에서 `/blog/my-new-post/`로 접속합니다. pnpm이 없는 현재 환경에서는 `node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1`로도 실행할 수 있습니다. 검색까지 확인하려면 빌드 후 `pnpm preview`를 사용합니다.

- `draft: false`이고 한국 시간 기준 발행일에 도달한 글만 공개됩니다.
- 초안은 공개 사이트의 경로·RSS·검색·사이트맵에서 제외됩니다. **공개 Git 저장소에 있는 초안 원문은 비공개가 아닙니다.** 민감한 메모를 저장하지 마세요.
- 미래 글은 날짜가 지나도 재빌드가 필요합니다. 자동 예약 빌드는 제공하지 않습니다.
- 로컬에서 글을 미리 볼 때만 `draft: false`로 바꾸고, 아직 게시하지 않을 글은 커밋 전에 `true`로 복원합니다.
- `slug`는 제목을 바꿔도 유지합니다. 중복·예약 슬러그와 잘못된 관련 프로젝트 참조는 빌드에서 차단됩니다.
- 시리즈는 `series`, `seriesTitle`, `seriesOrder`를 함께 지정합니다. 관련 프로젝트는 `relatedProjects: [comatching]`처럼 지정합니다.
- 카테고리·태그·시리즈 페이지는 공개 글에 따라 자동 생성됩니다. 목록은 10개 단위로 나뉩니다.
- 수정 시 `updatedAt: 'YYYY-MM-DD'`를 추가합니다. 발행일을 임의로 바꾸지 않습니다.

### 4. 발행하기

**Markdown을 GitHub에 push하는 것만으로는 현재 사이트에 게시되지 않습니다.** 이 저장소는 로컬에서 빌드한 산출물을 `gh-pages` 브랜치에 올리는 방식입니다.

1. `draft: false`와 발행일을 확인합니다.
2. 아래 배포 절의 테스트·검사·빌드를 실행합니다.
3. 글과 이미지 변경을 소스 브랜치에 커밋하고 push합니다.
4. `node scripts/publish-pages.mjs`를 실행합니다.
5. GitHub Pages 빌드가 완료된 뒤 실제 글 주소와 블로그 목록을 확인합니다.

직접 명령을 실행하는 대신, 이 저장소에서 **“이 초안을 블로그 글로 정리해서 미리보기까지 만들어줘”** 또는 **“이 글을 블로그에 발행해줘”**라고 요청해도 됩니다. 이미지와 메모·코드가 있으면 함께 제공하면 됩니다.

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
