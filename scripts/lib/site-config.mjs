import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CONFIG_FILE = path.join(ROOT, 'site.config.json');

const DEFAULT_SITE_CONFIG = {
  siteName: "Thomas's Blog",
  siteUrl: 'https://shangguangtao567-thomas.github.io/thomas-blog',
  authorName: 'Thomas',
  xHandle: '@GuangtaoS29545',
  xProfileUrl: 'https://x.com/GuangtaoS29545',
  buttondownUrl: '',
  plausibleDomain: '',
  primaryTopics: ['AI', 'Tools', 'Infrastructure', 'Open Source'],
};

export function loadSiteConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return DEFAULT_SITE_CONFIG;
  const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  return {
    ...DEFAULT_SITE_CONFIG,
    ...raw,
  };
}
