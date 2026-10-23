import { describe, expect, test } from 'bun:test';

const renderChannels = () => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './voice-channel-actions.render.tsx'],
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (!result.success) {
    throw new Error(result.stderr.toString());
  }

  const output = result.stdout.toString();

  const read = (marker: string) => {
    const start = output.indexOf(marker);

    if (start === -1) {
      throw new Error(`no ${marker} in the render output:\n${output}`);
    }

    const rest = output.slice(start + marker.length);
    const end = rest.indexOf('\n');

    return end === -1 ? rest.trim() : rest.slice(0, end).trim();
  };

  return {
    textChannel: read('__TEXT_CHANNEL__'),
    voiceChannel: read('__VOICE_CHANNEL__')
  };
};

describe('voice channel row', () => {
  // the voice channel has no context menu, its actions show up on hover
  test('should not open a context menu on a right click', () => {
    const { voiceChannel } = renderChannels();

    expect(voiceChannel).not.toContain('data-slot="context-menu-trigger"');
  });

  test('should keep the context menu of the text channel', () => {
    const { textChannel } = renderChannels();

    expect(textChannel).toContain('data-slot="context-menu-trigger"');
  });

  test('should offer the chat and the settings action with an accessible name', () => {
    const { voiceChannel } = renderChannels();

    expect(voiceChannel).toContain('aria-label="Open Text Chat"');
    expect(voiceChannel).toContain('aria-label="Configure channel"');
  });

  // the actions stay hidden until the row is hovered or one of them is focused
  test('should reveal the actions on hover and on focus', () => {
    const { voiceChannel } = renderChannels();

    expect(voiceChannel).toContain('opacity-0');
    expect(voiceChannel).toContain('group-hover:opacity-100');
    expect(voiceChannel).toContain('group-focus-within:opacity-100');
  });
});
