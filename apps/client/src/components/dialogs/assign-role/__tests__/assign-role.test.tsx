import { expect, test } from 'bun:test';

type TRenderResult = {
  dialogMarkup: string;
  selectedMarkup: string;
  longNameMarkup: string;
  emptyMarkup: string;
};

const runRender = (): TRenderResult => {
  const proc = Bun.spawnSync({
    cmd: ['bun', 'run', './assign-role.render.tsx'],
    cwd: import.meta.dir
  });

  const stdout = proc.stdout.toString();

  expect(proc.exitCode).toBe(0);
  expect(stdout).toContain('__RESULT__');

  const marker = '__RESULT__';
  const lines = stdout.split('\n');
  const resultLine = lines.find((line) => line.startsWith(marker));

  expect(resultLine).toBeDefined();

  return JSON.parse(resultLine!.slice(marker.length)) as TRenderResult;
};

test('the role assignment shows the available roles as a choice list', () => {
  const { dialogMarkup } = runRender();

  expect(dialogMarkup).toContain('Role for aria');
  expect(dialogMarkup).toContain('role="radiogroup"');
  expect(dialogMarkup).toContain('type="radio"');
  expect(dialogMarkup).toContain('name="assign-role"');
  expect(dialogMarkup).toContain('Moderator');
  expect(dialogMarkup).toContain('Support');
});

test('roles the member already has are not offered again', () => {
  const { dialogMarkup } = runRender();

  expect(dialogMarkup).not.toContain('>Guest<');
  expect(dialogMarkup).toContain('value="4"');
  expect(dialogMarkup).toContain('value="6"');
});

test('the selected role stays distinct from the available ones', () => {
  const { selectedMarkup } = runRender();

  expect(selectedMarkup).toContain('checked=""');
  expect(selectedMarkup).toContain('border-accent bg-raised text-accent-text');
  expect(selectedMarkup).toContain('border-control-border bg-input-surface');

  // the card of the checked radio is the one that carries the check icon, the
  // dom writes the attributes of the input in its own order
  const checkedCard = selectedMarkup
    .split('<input')
    .find((part) => part.includes('checked=""'));

  expect(checkedCard).toContain('<svg');
});

test('the choice list keeps the permission preview of the selected role', () => {
  const { selectedMarkup } = runRender();

  expect(selectedMarkup).toContain('Send messages');
});

test('a long role name stays readable', () => {
  const { longNameMarkup } = runRender();

  expect(longNameMarkup).toContain(
    'Community support specialist with a deliberately very long role name'
  );
  expect(longNameMarkup).toContain('break-words');
});

test('an empty choice set explains that every role is already assigned', () => {
  const { emptyMarkup } = runRender();

  expect(emptyMarkup).toContain('This user already has all available roles.');
  expect(emptyMarkup).not.toContain('role="radiogroup"');
});
