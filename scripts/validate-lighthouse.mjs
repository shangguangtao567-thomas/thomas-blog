import { existsSync } from 'node:fs';
import {
  lighthouseSummaryPath,
  lighthouseValidateReportPath,
  runLighthouseAudits,
} from './lib/lighthouse-regression.mjs';
import { readJsonFile, writeJsonFile } from './lib/validation-helpers.mjs';

const baselinePath = lighthouseSummaryPath('baseline');

if (!existsSync(baselinePath)) {
  throw new Error('Missing docs/baselines/lighthouse/baseline-summary.json. Run pnpm lighthouse:baseline first.');
}

const baseline = readJsonFile(baselinePath);
const { summary: current } = await runLighthouseAudits({ target: 'current' });

const baselineProfiles = new Map(baseline.profiles.map((profile) => [profile.id, profile]));
const errors = [];
const checks = [];

for (const profile of current.profiles) {
  const baselineProfile = baselineProfiles.get(profile.id);
  if (!baselineProfile) {
    errors.push(`Missing baseline profile ${profile.id}.`);
    continue;
  }

  const baselineFixtures = new Map(baselineProfile.fixtures.map((fixture) => [fixture.id, fixture]));
  const categoryRules = profile.gates?.categories || {};
  const metricRules = profile.gates?.metrics || {};

  for (const fixture of profile.fixtures) {
    const baselineFixture = baselineFixtures.get(fixture.id);
    if (!baselineFixture) {
      errors.push(`Missing baseline fixture ${fixture.id} for ${profile.id}.`);
      continue;
    }

    for (const [category, rule] of Object.entries(categoryRules)) {
      const currentScore = fixture.scores?.[category];
      const baselineScore = baselineFixture.scores?.[category];

      checks.push({
        kind: 'category',
        profile: profile.id,
        fixture: fixture.id,
        category,
        current: currentScore,
        baseline: baselineScore,
        minimum: rule.min,
        maxRegression: rule.maxRegression,
      });

      if (typeof currentScore === 'number' && typeof rule.min === 'number' && currentScore < rule.min) {
        errors.push(
          `${profile.id}/${fixture.id} ${category} score ${currentScore.toFixed(3)} is below minimum ${rule.min.toFixed(3)}`,
        );
      }

      if (
        typeof currentScore === 'number' &&
        typeof baselineScore === 'number' &&
        typeof rule.maxRegression === 'number' &&
        baselineScore - currentScore > rule.maxRegression
      ) {
        errors.push(
          `${profile.id}/${fixture.id} ${category} score regressed from ${baselineScore.toFixed(3)} to ${currentScore.toFixed(3)} (limit ${rule.maxRegression.toFixed(3)})`,
        );
      }
    }

    for (const [metricId, rule] of Object.entries(metricRules)) {
      const currentMetric = fixture.metrics?.[metricId]?.value;
      const baselineMetric = baselineFixture.metrics?.[metricId]?.value;

      checks.push({
        kind: 'metric',
        profile: profile.id,
        fixture: fixture.id,
        metric: metricId,
        current: currentMetric,
        baseline: baselineMetric,
        maxRegression: rule.maxRegression,
      });

      if (
        typeof currentMetric === 'number' &&
        typeof baselineMetric === 'number' &&
        typeof rule.maxRegression === 'number' &&
        currentMetric - baselineMetric > rule.maxRegression
      ) {
        errors.push(
          `${profile.id}/${fixture.id} ${metricId} regressed from ${baselineMetric} to ${currentMetric} (limit ${rule.maxRegression})`,
        );
      }
    }
  }
}

writeJsonFile(
  lighthouseValidateReportPath(),
  {
    generatedAt: new Date().toISOString(),
    baselineSummary: baselinePath,
    currentSummary: lighthouseSummaryPath('current'),
    errorCount: errors.length,
    checks,
    errors,
  },
);

if (errors.length) {
  throw new Error(`Lighthouse validation failed:\n- ${errors.join('\n- ')}`);
}

console.log(`Lighthouse validation passed across ${current.routeCount} routes and ${current.profileCount} profiles.`);
console.log(`Wrote report: ${lighthouseValidateReportPath()}`);
