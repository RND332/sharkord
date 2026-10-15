import { expect, test } from 'bun:test';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

test('autoupdate defaults on only for standalone production unless explicitly disabled', async () => {
  const dataPath = await fs.mkdtemp(
    path.join(os.tmpdir(), 'sharkord-autoupdate-config-')
  );

  try {
    const cases = [
      {
        environment: 'production',
        docker: 'false',
        autoUpdate: undefined,
        expected: true
      },
      {
        environment: 'production',
        docker: 'true',
        autoUpdate: undefined,
        expected: false
      },
      {
        environment: 'development',
        docker: 'false',
        autoUpdate: undefined,
        expected: false
      },
      {
        environment: 'production',
        docker: 'false',
        autoUpdate: 'false',
        expected: false
      }
    ];

    for (const item of cases) {
      const result = Bun.spawnSync(
        [
          process.execPath,
          '--eval',
          "import { config } from './src/config.ts'; console.log(String(config.server.autoupdate))"
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            SHARKORD_ENV: item.environment,
            SHARKORD_MEDIASOUP_BIN_NAME: 'mediasoup-worker',
            SHARKORD_DATA_PATH: path.join(
              dataPath,
              item.environment,
              item.docker,
              String(item.autoUpdate)
            ),
            SHARKORD_WEBRTC_ANNOUNCED_ADDRESS: '127.0.0.1',
            RUNNING_IN_DOCKER: item.docker,
            SHARKORD_AUTOUPDATE: item.autoUpdate,
            NODE_ENV: 'production'
          }
        }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString().trim()).toBe(String(item.expected));
    }
  } finally {
    await fs.rm(dataPath, { recursive: true, force: true });
  }
});
