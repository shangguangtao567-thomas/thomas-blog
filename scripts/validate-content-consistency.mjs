import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { baselineDir, buildContentBaseline, loadFrozenCollections, readJsonFile } from './lib/validation-helpers.mjs';

const baselinePath = join(baselineDir, 'baseline-content-manifest.json');

if (!existsSync(baselinePath)) {
  throw new Error('Missing docs/baselines/baseline-content-manifest.json. Run pnpm baseline:generate first.');
}

const baseline = readJsonFile(baselinePath);
const current = buildContentBaseline(loadFrozenCollections());

function slugHashMap(collection) {
  return new Map((collection?.items || []).map((item) => [item.slug, item.hash]));
}

const errors = [];
const baselineCollections = baseline.collections || {};
const currentCollections = current.collections || {};
const collectionNames = new Set([...Object.keys(baselineCollections), ...Object.keys(currentCollections)]);

for (const name of collectionNames) {
  const expected = baselineCollections[name];
  const actual = currentCollections[name];

  if (!expected) {
    errors.push(`[${name}] extra collection present in current manifest`);
    continue;
  }

  if (!actual) {
    errors.push(`[${name}] missing collection in current manifest`);
    continue;
  }

  if (expected.source !== actual.source) {
    errors.push(`[${name}] source mismatch: expected ${expected.source}, got ${actual.source}`);
  }

  const expectedMap = slugHashMap(expected);
  const actualMap = slugHashMap(actual);
  const expectedSlugs = [...expectedMap.keys()].sort();
  const actualSlugs = [...actualMap.keys()].sort();

  const missing = expectedSlugs.filter((slug) => !actualMap.has(slug));
  const extra = actualSlugs.filter((slug) => !expectedMap.has(slug));
  if (missing.length) errors.push(`[${name}] missing slugs: ${missing.join(', ')}`);
  if (extra.length) errors.push(`[${name}] extra slugs: ${extra.join(', ')}`);

  for (const slug of expectedSlugs) {
    if (!actualMap.has(slug)) continue;
    const expectedHash = expectedMap.get(slug);
    const actualHash = actualMap.get(slug);
    if (expectedHash !== actualHash) {
      errors.push(`[${name}] hash drift for ${slug}`);
    }
  }
}

if (errors.length) {
  throw new Error(`Content consistency validation failed:\n- ${errors.join('\n- ')}`);
}

console.log(`Content consistency validated for ${collectionNames.size} collections.`);
