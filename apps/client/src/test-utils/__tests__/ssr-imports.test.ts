import { describe, expect, test } from 'bun:test';
import path from 'node:path';

const clientRoot = path.resolve(import.meta.dir, '..', '..', '..');
const checkScript = path.join(import.meta.dir, 'ssr-server-check.ts');
const reportMarker = 'SSR_CHECK:';

type TServerCheckReport = {
  window: string;
  document: string;
  rendered: Record<string, number>;
};

const runServerCheck = () => {
  const result = Bun.spawnSync([process.execPath, 'run', checkScript], {
    cwd: clientRoot
  });

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString()
  };
};

const parseReport = (stdout: string): TServerCheckReport => {
  const line = stdout
    .split('\n')
    .find((candidate) => candidate.startsWith(reportMarker));

  if (!line) {
    throw new Error(`the server check printed no report:\n${stdout}`);
  }

  return JSON.parse(line.slice(reportMarker.length)) as TServerCheckReport;
};

describe('the modules that touch the browser', () => {
  test('import and render without a window and a document', () => {
    const result = runServerCheck();

    expect(result.stderr).not.toContain('is not defined');
    expect(result.exitCode).toBe(0);

    const report = parseReport(result.stdout);

    // the child has to run without a browser, otherwise the guards are skipped
    expect(report.window).toBe('undefined');
    expect(report.document).toBe('undefined');

    // the components that show something have to render their markup
    expect(report.rendered.FullScreenImage).toBeGreaterThan(0);
    expect(report.rendered.SidebarDnd).toBeGreaterThan(0);
    expect(report.rendered.Themes).toBeGreaterThan(0);
  });
});
