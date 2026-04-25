import { captureScreenshots, parseCaptureArgs } from './lib/screenshot-regression.mjs';

const { target } = parseCaptureArgs();
const result = await captureScreenshots({ target });

console.log(`Captured ${result.fixtures.length * result.widths.length} screenshots into ${result.outputDir}`);
console.log(`Wrote manifest: ${result.manifestPath}`);
