import { createRequire } from 'node:module';
import path from 'node:path';
import { searchForWorkspaceRoot } from 'vite';

const require = createRequire(import.meta.url);
const interManifest =
  require.resolve('@fontsource-variable/inter/package.json');
const interDirectory = path.dirname(interManifest);

export const fsAllow = [
  searchForWorkspaceRoot(import.meta.dirname),
  path.join(interDirectory, 'files')
];
