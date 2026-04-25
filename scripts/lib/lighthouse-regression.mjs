import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import {
  baselineDir,
  readJsonFile,
  writeJsonFile,
} from './validation-helpers.mjs';
import { startStaticServer } from './screenshot-regression.mjs';

const execFileAsync = promisify(execFile);
const fixtureMatrixPath = join(baselineDir, 'baseline-fixture-matrix.json');
const lighthouseRootDir = join(baselineDir, 'lighthouse');
const metricIds = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'speed-index',
  'total-blocking-time',
  'cumulative-layout-shift',
];
const categoryIds = ['performance', 'accessibility', 'seo'];
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

export function loadLighthouseMatrix() {
  if (!existsSync(fixtureMatrixPath)) {
    throw new Error('Missing docs/baselines/baseline-fixture-matrix.json. Run pnpm baseline:generate first.');
  }

  const fixtureMatrix = readJsonFile(fixtureMatrixPath);
  const lighthouseConfig = fixtureMatrix.lighthouse;
  if (!lighthouseConfig?.fixtures?.length || !lighthouseConfig?.profiles?.length) {
    throw new Error('No Lighthouse fixtures found in docs/baselines/baseline-fixture-matrix.json.');
  }

  return lighthouseConfig;
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
  rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function relativePath(filePath) {
  return relative(process.cwd(), filePath);
}

function roundScore(value) {
  if (typeof value !== 'number') return null;
  return Number(value.toFixed(3));
}

function roundMetric(id, value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Number(value.toFixed(id === 'cumulative-layout-shift' ? 3 : 0));
}

function buildCategoryScores(lhr) {
  return Object.fromEntries(
    categoryIds.map((id) => [id, roundScore(lhr.categories?.[id]?.score ?? null)]),
  );
}

function buildMetrics(lhr) {
  return Object.fromEntries(
    metricIds.map((id) => {
      const audit = lhr.audits?.[id];
      return [
        id,
        audit
          ? {
              title: audit.title,
              value: roundMetric(id, audit.numericValue),
              displayValue: audit.displayValue || '',
            }
          : null,
      ];
    }),
  );
}

function buildAverages(entries = []) {
  return Object.fromEntries(
    categoryIds.map((category) => {
      const values = entries
        .map((entry) => entry.scores?.[category])
        .filter((value) => typeof value === 'number');
      if (!values.length) return [category, null];
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return [category, roundScore(average)];
    }),
  );
}

function outputDirectoryFor(target, lighthouseConfig) {
  const relativeDir = lighthouseConfig.directories?.[target];
  if (!relativeDir) throw new Error(`Unknown Lighthouse target "${target}".`);
  return resolve(process.cwd(), relativeDir);
}

export function lighthouseManifestPath(target) {
  return join(lighthouseRootDir, `manifest-${target}.json`);
}

export function lighthouseSummaryPath(target) {
  return join(lighthouseRootDir, `${target}-summary.json`);
}

export function lighthouseValidateReportPath() {
  return join(lighthouseRootDir, 'validate-report.json');
}

function reportPathFor(outputDir, profileId, fixtureId) {
  return join(outputDir, profileId, `${fixtureId}.json`);
}

function buildLighthouseArgs(url, outputPath, profile, fixture) {
  const auditTimeoutMs = fixture.auditTimeoutMs || profile.auditTimeoutMs || 45000;
  const args = [
    'exec',
    'lighthouse',
    url,
    '--quiet',
    '--output=json',
    `--output-path=${outputPath}`,
    '--only-categories=performance,accessibility,seo',
    '--throttling-method=simulate',
    '--disable-storage-reset',
    `--max-wait-for-load=${auditTimeoutMs}`,
    `--chrome-path=${chromium.executablePath()}`,
    '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
  ];

  if (profile.config === 'desktop') {
    args.push('--preset=desktop');
  }

  return { args, auditTimeoutMs };
}

async function runSingleAudit({ baseUrl, outputDir, profile, fixture }) {
  const outputPath = reportPathFor(outputDir, profile.id, fixture.id);
  ensureDir(join(outputDir, profile.id));

  const { args, auditTimeoutMs } = buildLighthouseArgs(`${baseUrl}${fixture.path}`, outputPath, profile, fixture);
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await execFileAsync(pnpmCommand, args, {
        cwd: process.cwd(),
        timeout: auditTimeoutMs + 5000,
        maxBuffer: 1024 * 1024 * 32,
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  if (lastError) {
    const stderr = lastError?.stderr?.trim?.() || '';
    const stdout = lastError?.stdout?.trim?.() || '';
    const detail = stderr || stdout || lastError?.message || 'Unknown Lighthouse error';
    throw new Error(`Lighthouse audit failed for ${fixture.id} (${profile.id}) at ${fixture.path}: ${detail}`);
  }

  const result = readJsonFile(outputPath);
  const lhr = result?.lhr || result;
  if (!lhr?.finalUrl) {
    throw new Error(`Lighthouse produced an invalid report for ${fixture.id} (${profile.id}).`);
  }

  return {
    id: fixture.id,
    kind: fixture.kind,
    label: fixture.label,
    path: fixture.path,
    slug: fixture.slug,
    profile: profile.id,
    jsonPath: relativePath(outputPath),
    requestedUrl: lhr.requestedUrl,
    finalUrl: lhr.finalUrl,
    fetchTime: lhr.fetchTime,
    scores: buildCategoryScores(lhr),
    metrics: buildMetrics(lhr),
  };
}

function buildSummary({ target, lighthouseConfig, outputDir, entries }) {
  return {
    generatedAt: new Date().toISOString(),
    target,
    outputDir: relativePath(outputDir),
    profileCount: lighthouseConfig.profiles.length,
    routeCount: lighthouseConfig.fixtures.length,
    profiles: lighthouseConfig.profiles.map((profile) => {
      const fixtures = entries.filter((entry) => entry.profile === profile.id);
      return {
        id: profile.id,
        label: profile.label,
        gates: profile.gates,
        averages: buildAverages(fixtures),
        fixtures,
      };
    }),
  };
}

function buildManifest({ target, outputDir, entries }) {
  return {
    generatedAt: new Date().toISOString(),
    target,
    outputDir: relativePath(outputDir),
    files: entries.map((entry) => ({
      id: entry.id,
      profile: entry.profile,
      path: entry.jsonPath,
    })),
  };
}

export async function runLighthouseAudits({ target = 'current' } = {}) {
  const lighthouseConfig = loadLighthouseMatrix();
  const outputDir = outputDirectoryFor(target, lighthouseConfig);
  cleanDir(outputDir);
  ensureDir(lighthouseRootDir);

  const server = await startStaticServer();

  try {
    const entries = [];

    for (const profile of lighthouseConfig.profiles) {
      for (const fixture of lighthouseConfig.fixtures) {
        entries.push(await runSingleAudit({ baseUrl: server.baseUrl, outputDir, profile, fixture }));
      }
    }

    const summary = buildSummary({ target, lighthouseConfig, outputDir, entries });
    const manifest = buildManifest({ target, outputDir, entries });

    writeJsonFile(lighthouseSummaryPath(target), summary);
    writeJsonFile(lighthouseManifestPath(target), manifest);

    return { summary, manifest, outputDir };
  } finally {
    await server.close();
  }
}
