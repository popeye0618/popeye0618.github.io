const input = document.querySelector('#blog-search');
const searchStatus = document.querySelector('#search-status');
const results = document.querySelector('#search-results');
let engine;
let generation = 0;
let timer;
input?.addEventListener('input', () => {
  const query = input.value.trim();
  const current = ++generation;
  clearTimeout(timer);
  results.replaceChildren();
  if (!query) {
    searchStatus.textContent = '제목과 본문에서 찾아보세요.';
    return;
  }
  searchStatus.textContent = '검색 중…';
  timer = setTimeout(async () => {
    try {
      engine ??= import('/pagefind/pagefind.js');
      const response = await (await engine).search(query);
      const matches = await Promise.all(
        response.results.slice(0, 10).map((r) => r.data()),
      );
      if (current !== generation) return;
      searchStatus.textContent = response.results.length
        ? `${response.results.length}개의 글을 찾았어요.${response.results.length > 10 ? ' 상위 10개를 표시합니다.' : ''}`
        : '검색 결과가 없어요. 다른 단어로 검색해 보세요.';
      for (const item of matches) {
        const link = document.createElement('a');
        link.href = item.url;
        const title = document.createElement('strong');
        title.textContent = item.meta.title ?? '개발 기록';
        const description = document.createElement('p');
        description.textContent = item.plain_excerpt ?? '';
        link.append(title, description);
        results.append(link);
      }
    } catch {
      if (current !== generation) return;
      engine = undefined;
      searchStatus.textContent =
        '검색을 불러오지 못했어요. 잠시 후 다시 입력하거나 아래 목록을 이용해 주세요.';
    }
  }, 180);
});

export {};
