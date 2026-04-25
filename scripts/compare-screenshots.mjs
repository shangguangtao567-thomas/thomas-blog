import { compareScreenshots } from './lib/screenshot-regression.mjs';

const result = await compareScreenshots();

console.log(`Screenshot comparison passed using current captures in ${result.currentOutputDir}`);
console.log(`Diff directory: ${result.diffOutputDir}`);
console.log(`Wrote report: ${result.reportPath}`);
