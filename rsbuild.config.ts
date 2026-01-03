import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import packageJson from './package.json';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    define: {
      'process.env.APP_VERSION': JSON.stringify(`v${packageJson.version}`),
    },
  },
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
