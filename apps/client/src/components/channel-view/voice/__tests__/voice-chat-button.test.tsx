import { describe, expect, test } from 'bun:test';

const renderVoiceChatButton = (mode: 'closed' | 'open' | 'other') => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './voice-chat-button.render.tsx', mode],
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (!result.success) {
    throw new Error(result.stderr.toString());
  }

  const output = result.stdout.toString();
  const marker = output.indexOf('__MARKUP__');

  if (marker === -1) {
    throw new Error(`no markup in the render output:\n${output}`);
  }

  return output.slice(marker + '__MARKUP__'.length).trim();
};

describe('VoiceChatButton', () => {
  test('should open the chat of the channel', () => {
    const html = renderVoiceChatButton('closed');

    expect(html).toContain('aria-label="Open Voice Chat"');
  });

  test('should not render the button while the chat of the channel is open', () => {
    const html = renderVoiceChatButton('open');

    expect(html).not.toContain('aria-label="Open Voice Chat"');
  });

  test('should render the button while the chat of another channel is open', () => {
    const html = renderVoiceChatButton('other');

    expect(html).toContain('aria-label="Open Voice Chat"');
  });

  test('should not render a tooltip over the button', () => {
    const html = renderVoiceChatButton('closed');

    expect(html).not.toContain('data-slot="tooltip-trigger"');
    expect(html).not.toContain('data-slot="tooltip-content"');
  });
});
