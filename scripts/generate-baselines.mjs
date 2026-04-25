import { join } from 'node:path';
import {
  baselineDir,
  buildContentBaseline,
  buildFixtureMatrix,
  buildRouteBaseline,
  loadSiteConfig,
  loadFrozenCollections,
  writeJsonFile,
} from './lib/validation-helpers.mjs';

const collections = loadFrozenCollections();
const contentBaseline = buildContentBaseline(collections);
const siteConfig = loadSiteConfig();
const routeBaseline = buildRouteBaseline({ siteUrl: siteConfig.siteUrl, posts: collections.posts, digests: collections.digests, digestDetails: collections.digestDetails, topics: collections.topics });

const fixtureMatrix = buildFixtureMatrix({
  posts: collections.posts,
  digests: collections.digests,
  digestDetails: collections.digestDetails,
  topics: collections.topics,
});

writeJsonFile(join(baselineDir, 'baseline-content-manifest.json'), contentBaseline);
writeJsonFile(join(baselineDir, 'baseline-route-manifest.json'), routeBaseline);
writeJsonFile(join(baselineDir, 'baseline-fixture-matrix.json'), fixtureMatrix);

console.log('Generated baseline artifacts in docs/baselines');
