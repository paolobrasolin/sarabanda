import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  server: {
    base: '/sarafaccia/',
  },
  html: {
    title: 'sarafaccia',
    inject: 'body',
  },
  output: {
    inlineScripts: true,
    inlineStyles: true,
  }
});
