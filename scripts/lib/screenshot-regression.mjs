import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { baselineDir, readJsonFile, stableJson } from './validation-helpers.mjs';

const fixtureMatrixPath = join(baselineDir, 'baseline-fixture-matrix.json');
const distDir = resolve(process.cwd(), 'dist');

function contentType(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.js' || extension === '.mjs') return 'text/javascript; charset=utf-8';
  if (extension === '.json') return 'application/json; charset=utf-8';
  if (extension === '.xml') return 'application/xml; charset=utf-8';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.woff2') return 'font/woff2';
  if (extension === '.txt') return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function sanitizeHtmlForLocalAudit(html = '') {
  return String(html || '')
    .replace(/<meta\b[^>]*http-equiv="refresh"[^>]*>/gi, '')
    .replace(/<link\b[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>/gi, '')
    .replace(/<link\b[^>]*href="https:\/\/fonts\.gstatic\.com[^"]*"[^>]*>/gi, '')
    .replace(/<script\b[^>]*src="https:\/\/plausible\.io\/js\/script\.js"[^>]*><\/script>/gi, '');
}

function responseBody(filePath) {
  const type = contentType(filePath);
  if (!type.startsWith('text/html')) {
    return readFileSync(filePath);
  }

  return sanitizeHtmlForLocalAudit(readFileSync(filePath, 'utf8'));
}

function toDistFile(requestPath = '/') {
  const normalized = decodeURIComponent(String(requestPath || '/')).replace(/\/{2,}/g, '/');
  const pathname = normalized === '/' ? '/index.html' : normalized.endsWith('/') ? `${normalized}index.html` : normalized;
  return resolve(distDir, `.${pathname}`);
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
  rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function parseArgValue(args, flag, fallback) {
  const exact = args.find((arg) => arg.startsWith(`${flag}=`));
  if (!exact) return fallback;
  return exact.slice(flag.length + 1);
}

export function loadScreenshotMatrix() {
  if (!existsSync(fixtureMatrixPath)) {
    throw new Error('Missing docs/baselines/baseline-fixture-matrix.json. Run pnpm baseline:generate first.');
  }

  const fixtureMatrix = readJsonFile(fixtureMatrixPath);
  const screenshotConfig = fixtureMatrix.screenshots;
  if (!screenshotConfig?.fixtures?.length) {
    throw new Error('No screenshot fixtures found in docs/baselines/baseline-fixture-matrix.json.');
  }

  return screenshotConfig;
}

export function parseCaptureArgs(argv = process.argv.slice(2)) {
  return {
    target: parseArgValue(argv, '--target', 'current'),
  };
}

export async function startStaticServer() {
  if (!existsSync(distDir)) {
    throw new Error('Missing dist/. Run pnpm build before capturing screenshots.');
  }

  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    let filePath = toDistFile(url.pathname);
    if (!filePath.startsWith(distDir)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    if (!existsSync(filePath) && !extname(filePath)) {
      const htmlPath = `${filePath}.html`;
      if (existsSync(htmlPath)) filePath = htmlPath;
    }

    if (!existsSync(filePath)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'content-type': contentType(filePath) });
    response.end(responseBody(filePath));
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', () => resolvePromise());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start screenshot server.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolvePromise, rejectPromise) => {
        server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
      });
    },
  };
}

function outputDirectoryFor(target, screenshotConfig) {
  const relativeDir = screenshotConfig.directories?.[target];
  if (!relativeDir) throw new Error(`Unknown screenshot target "${target}".`);
  return resolve(process.cwd(), relativeDir);
}

function screenshotPath(outputDir, fixture, width) {
  return join(outputDir, `${fixture.id}-${width}.png`);
}

function fixtureError(fixture, width, reason) {
  return new Error(`Screenshot fixture "${fixture.id}" failed at ${width}px for ${fixture.path}: ${reason}`);
}

async function installRequestRouting(page) {
  await page.addInitScript(() => {
    const removeRefreshTags = () => {
      document.querySelectorAll('meta[http-equiv="refresh"]').forEach((node) => node.remove());
    };

    removeRefreshTags();
    new MutationObserver(() => removeRefreshTags()).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
  await page.route('https://fonts.googleapis.com/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/css; charset=utf-8',
      body: '',
    }),
  );
  await page.route('https://fonts.gstatic.com/*', (route) => route.abort());
}

async function waitForFixtureReady(page, fixture) {
  const readyTimeoutMs = fixture.readyTimeoutMs || 5000;
  const readySelector = fixture.readySelector || 'body';

  await page.waitForLoadState('domcontentloaded', { timeout: readyTimeoutMs });
  await page.waitForFunction(() => document.readyState === 'interactive' || document.readyState === 'complete', undefined, {
    timeout: readyTimeoutMs,
  });
  await page.waitForSelector(readySelector, {
    state: 'visible',
    timeout: readyTimeoutMs,
  });
  await page.evaluate(async (timeoutMs) => {
    if (!('fonts' in document)) return;
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }, Math.min(readyTimeoutMs, 1500));
  await page.evaluate(async (timeoutMs) => {
    const images = Array.from(document.images);
    const waitForImage = (img) =>
      Promise.race([
        img.decode ? img.decode().catch(() => undefined) : Promise.resolve(),
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve(undefined);
            return;
          }
          img.addEventListener('load', () => resolve(undefined), { once: true });
          img.addEventListener('error', () => resolve(undefined), { once: true });
        }),
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
      ]);

    for (const img of images) {
      img.loading = 'eager';
      img.decoding = 'sync';
      try {
        img.fetchPriority = 'high';
      } catch {}

      if (!img.complete || img.naturalWidth === 0) {
        img.scrollIntoView({ block: 'center' });
      }

      await waitForImage(img);
    }

    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, Math.min(readyTimeoutMs, 2000));
}

function writeManifest({ target, outputDir, widths, fixtures }) {
  const manifestPath = join(baselineDir, `screenshot-manifest-${target}.json`);
  const manifest = {
    generatedAt: new Date().toISOString(),
    target,
    outputDir,
    widths,
    files: fixtures.flatMap((fixture) =>
      widths.map((width) => ({
        id: fixture.id,
        width,
        path: screenshotPath(outputDir, fixture, width),
      })),
    ),
  };

  writeFileSync(manifestPath, `${stableJson(manifest)}\n`);
  return manifestPath;
}

export async function captureScreenshots({ target = 'current' } = {}) {
  const screenshotConfig = loadScreenshotMatrix();
  const widths = screenshotConfig.widths || [390, 1440];
  const fixtures = screenshotConfig.fixtures;
  const outputDir = outputDirectoryFor(target, screenshotConfig);

  cleanDir(outputDir);

  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const fixture of fixtures) {
      for (const width of widths) {
        const page = await browser.newPage({
          viewport: { width, height: 1400 },
          colorScheme: 'light',
          reducedMotion: 'reduce',
        });

        try {
          await installRequestRouting(page);
          const response = await page.goto(`${server.baseUrl}${fixture.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: fixture.navigationTimeoutMs || 6000,
          });

          if (!response) {
            throw fixtureError(fixture, width, 'no HTTP response');
          }

          if (!response.ok()) {
            throw fixtureError(fixture, width, `HTTP ${response.status()}`);
          }

          await page.addStyleTag({
            content: `
              *,
              *::before,
              *::after {
                animation: none !important;
                transition: none !important;
                caret-color: transparent !important;
              }

              .skip-link {
                transform: translateY(-140%) !important;
              }

              :focus,
              :focus-visible {
                box-shadow: none !important;
              }
            `,
          });
          await waitForFixtureReady(page, fixture);
          await page.evaluate(() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          });
          await page.screenshot({
            path: screenshotPath(outputDir, fixture, width),
            fullPage: true,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw fixtureError(fixture, width, message);
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const manifestPath = writeManifest({ target, outputDir, widths, fixtures });

  return {
    target,
    outputDir,
    widths,
    fixtures,
    manifestPath,
  };
}

function readPng(filePath) {
  return PNG.sync.read(readFileSync(filePath));
}

export async function compareScreenshots() {
  const screenshotConfig = loadScreenshotMatrix();
  const widths = screenshotConfig.widths || [390, 1440];
  const fixtures = screenshotConfig.fixtures;
  const baselineOutputDir = outputDirectoryFor('baseline', screenshotConfig);
  const diffOutputDir = outputDirectoryFor('diff', screenshotConfig);

  cleanDir(diffOutputDir);
  const captureResult = await captureScreenshots({ target: 'current' });
  const currentOutputDir = captureResult.outputDir;
  const diffs = [];
  const missing = [];

  for (const fixture of fixtures) {
    for (const width of widths) {
      const baselinePath = screenshotPath(baselineOutputDir, fixture, width);
      const currentPath = screenshotPath(currentOutputDir, fixture, width);
      const diffPath = screenshotPath(diffOutputDir, fixture, width);

      if (!existsSync(baselinePath)) {
        missing.push(`Missing baseline screenshot: ${baselinePath}`);
        continue;
      }

      const baselinePng = readPng(baselinePath);
      const currentPng = readPng(currentPath);

      if (baselinePng.width !== currentPng.width || baselinePng.height !== currentPng.height) {
        diffs.push({
          id: fixture.id,
          width,
          pixels: -1,
          baselinePath,
          currentPath,
          diffPath,
          reason: 'dimension-mismatch',
        });
        continue;
      }

      const diffPng = new PNG({ width: baselinePng.width, height: baselinePng.height });
      const pixels = pixelmatch(
        baselinePng.data,
        currentPng.data,
        diffPng.data,
        baselinePng.width,
        baselinePng.height,
        { threshold: 0.1 },
      );

      if (pixels > 0) {
        writeFileSync(diffPath, PNG.sync.write(diffPng));
        diffs.push({
          id: fixture.id,
          width,
          pixels,
          baselinePath,
          currentPath,
          diffPath,
        });
      }
    }
  }

  const reportPath = join(baselineDir, 'screenshot-diff-report.json');
  writeFileSync(
    reportPath,
    `${stableJson({
      generatedAt: new Date().toISOString(),
      missing,
      diffs,
    })}\n`,
  );

  if (missing.length || diffs.length) {
    const messages = [
      ...missing,
      ...diffs.map((diff) =>
        diff.reason === 'dimension-mismatch'
          ? `Screenshot size mismatch for ${diff.id} at ${diff.width}px`
          : `Screenshot drift for ${diff.id} at ${diff.width}px: ${diff.pixels} pixels differ`,
      ),
    ];
    throw new Error(messages.join('\n'));
  }

  return {
    currentOutputDir,
    diffOutputDir,
    reportPath,
  };
}
