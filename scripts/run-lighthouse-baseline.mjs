import { runLighthouseAudits, lighthouseSummaryPath } from './lib/lighthouse-regression.mjs';

const { summary } = await runLighthouseAudits({ target: 'baseline' });

console.log(`Lighthouse baseline captured for ${summary.routeCount} routes across ${summary.profileCount} profiles.`);
console.log(`Wrote summary: ${lighthouseSummaryPath('baseline')}`);
