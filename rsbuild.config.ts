import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  server: {
    base: '/sarabanda/',
  },
  html: {
    title: 'sarabanda',
    inject: 'body',
    favicon: './src/assets/favicon.ico',
  },
  output: {
    inlineScripts: true,
    inlineStyles: true,
  },
});
