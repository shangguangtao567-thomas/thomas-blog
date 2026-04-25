import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const siteConfig = JSON.parse(readFileSync(resolve(root, 'site.config.json'), 'utf-8'));

export default defineConfig({
  site: siteConfig.siteUrl || 'https://blog.lincept.com',
  output: 'static',
  trailingSlash: 'always',
});
