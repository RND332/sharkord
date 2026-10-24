import { describe, expect, test } from 'bun:test';

type TScenario = {
  voiceChatOpen: boolean;
  membersOpen: boolean;
  threadOpen: boolean;
  voiceChatFlag: string | null;
  membersFlag: string | null;
  restoredVoiceChatOpen: boolean;
  restoredMembersOpen: boolean;
  restoredThreadOpen: boolean;
};

const scenarios = (): Record<string, TScenario> => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './dock-preferences.fixture.ts'],
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (!result.success) {
    throw new Error(result.stderr.toString());
  }

  const output = result.stdout.toString();
  const start = output.indexOf('__DOCKS__');

  if (start === -1) {
    throw new Error(`no scenarios in the fixture output:\n${output}`);
  }

  const rest = output.slice(start + '__DOCKS__'.length);
  const end = rest.indexOf('\n');

  return JSON.parse(
    (end === -1 ? rest.trim() : rest.slice(0, end)).trim()
  ) as Record<string, TScenario>;
};

describe('the stored dock preferences', () => {
  test('should keep the voice chat as the only dock that is stored', () => {
    const { voiceChat } = scenarios();

    expect(voiceChat.voiceChatOpen).toBe(true);
    expect(voiceChat.membersOpen).toBe(false);
    expect(voiceChat.voiceChatFlag).toBe('true');
    expect(voiceChat.membersFlag).toBe('false');
  });

  test('should keep the members panel as the only dock that is stored', () => {
    const { members } = scenarios();

    expect(members.membersOpen).toBe(true);
    expect(members.voiceChatOpen).toBe(false);
    expect(members.voiceChatFlag).toBe('false');
    expect(members.membersFlag).toBe('true');
  });

  test('should drop the stored flags of the docks that a thread replaces', () => {
    const { thread } = scenarios();

    expect(thread.threadOpen).toBe(true);
    expect(thread.voiceChatOpen).toBe(false);
    expect(thread.membersOpen).toBe(false);
    expect(thread.voiceChatFlag).toBe('false');
    expect(thread.membersFlag).toBe('false');
  });

  test('should restore the members panel after a reload', () => {
    const { membersOnly } = scenarios();

    expect(membersOnly.restoredMembersOpen).toBe(true);
    expect(membersOnly.restoredVoiceChatOpen).toBe(false);
    expect(membersOnly.restoredThreadOpen).toBe(false);
  });

  test('should not restore a dock that was replaced before the reload', () => {
    const { thread } = scenarios();

    expect(thread.restoredVoiceChatOpen).toBe(false);
    expect(thread.restoredMembersOpen).toBe(false);
    expect(thread.restoredThreadOpen).toBe(false);
  });

  test('should keep the members panel closed when the stored flags disagree', () => {
    const { legacyConflict } = scenarios();

    expect(legacyConflict.restoredVoiceChatOpen).toBe(true);
    expect(legacyConflict.restoredMembersOpen).toBe(false);
    expect(legacyConflict.membersFlag).toBe('false');
  });
});
