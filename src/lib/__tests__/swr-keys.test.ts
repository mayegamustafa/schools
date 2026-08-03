import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Guards against a regression that silently emptied the admin console.
 *
 * The web client authenticates with a cookie now, so `token` from useApp() is an
 * opaque marker, not a JWT. SWR v2 passes an array key to the fetcher as a
 * single argument, so a leftover array key was stringified straight into the
 * request URL — appending the marker to the last query parameter and filtering
 * on a status no school has. The admin overview still looked correct, because
 * its totals ignore that filter, so the two pages disagreed.
 */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'generated' || entry.name === 'node_modules') continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      out.push(full);
    }
  }

  return out;
}

const SRC = path.resolve(__dirname, '../../');
const files = sourceFiles(SRC);

describe('SWR keys', () => {
  it('scans a meaningful number of source files', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never pairs a request key with the session marker', () => {
    const offenders = files.filter(file => {
      const source = readFileSync(file, 'utf8');
      return /useSWR\(\s*\w+\s*\?\s*\[[^\]]*,\s*token\s*\]/.test(source)
        || /\[\s*['"`][^'"`]*['"`]\s*,\s*token\s*\]/.test(source);
    }).map(file => path.relative(process.cwd(), file));

    expect(
      offenders,
      `array SWR keys get stringified into the URL: ${offenders.join(', ')}`
    ).toEqual([]);
  });

  it('sends no Authorization headers from the browser', () => {
    // The cookie authenticates; a Bearer header built from the marker would fail.
    const offenders = files.filter(file => {
      if (!file.endsWith('.tsx')) return false;
      return /Authorization:\s*`Bearer/.test(readFileSync(file, 'utf8'));
    }).map(file => path.relative(process.cwd(), file));

    expect(offenders, `client sends Bearer headers: ${offenders.join(', ')}`).toEqual([]);
  });
});
