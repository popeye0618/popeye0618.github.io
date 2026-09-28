import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://popeye0618.github.io',
  output: 'static',
  trailingSlash: 'always',
  markdown: { shikiConfig: { theme: 'github-dark' } },
  devToolbar: { enabled: false },
});
