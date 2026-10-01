import { defineConfig } from 'vite';

// GitHub Pages serves the site from /typhoon-eye/.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/typhoon-eye/' : '/',
});
