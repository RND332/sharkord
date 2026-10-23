import { describe, expect, test } from 'bun:test';

const renderDevices = (argument?: string) => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './devices.render.tsx',
      ...(argument ? [argument] : [])
    ],
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

  return output.slice(marker + '__MARKUP__'.length);
};

const isSwitchDisabled = (html: string, label: string) =>
  new RegExp(
    `<span[^>]*data-disabled=""[^>]*aria-label="${label.replace(/[()]/g, '\\$&')}"`
  ).test(html);

describe('Devices', () => {
  test('should pair the speaker and the microphone choice', () => {
    const html = renderDevices();

    // both device fields share one wrapping row of two columns
    expect(html).toContain('flex flex-wrap gap-5');
    expect(html.match(/basis-\[510px\]/g)?.length).toBe(2);
    expect(html).toContain('>Playback</span>');
    expect(html).toContain('>Microphone</span>');
    expect(html.match(/text-\[13px\] leading-4 text-foreground/g)?.length).toBe(
      2
    );
    // a device stays a recessed field, the design keeps the border
    expect(html.match(/w-full px-\[15px\]/g)?.length).toBe(2);
  });

  test('should group the settings like the design does', () => {
    const html = renderDevices();

    expect(html.match(/border-t border-line pt-\[14px\]/g)?.length).toBe(4);
    expect(
      html.match(
        /text-\[13px\] font-bold uppercase leading-4 tracking-\[0\.08em\] text-subtle-foreground/g
      )?.length
    ).toBe(4);

    const audio = html.indexOf('>Audio devices<');
    const microphone = html.indexOf('>Microphone<');
    const camera = html.indexOf('>Camera<');
    const sharing = html.indexOf('>Screen Sharing<');

    expect(audio).toBeGreaterThan(-1);
    expect(microphone).toBeGreaterThan(audio);
    expect(camera).toBeGreaterThan(microphone);
    expect(sharing).toBeGreaterThan(camera);
  });

  test('should render the preference rows without their own separator', () => {
    const html = renderDevices();

    expect(
      html.match(/flex w-full items-center justify-between gap-4/g)?.length
    ).toBe(14);
    expect(html).not.toContain('border-b border-line py-[15px]');
  });

  test('should render a preference as a plain value with a chevron', () => {
    const html = renderDevices();

    expect(
      html.match(/h-auto w-auto border-0 bg-transparent px-0 py-1/g)?.length
    ).toBe(4);
    expect(html).toContain('>Noise Suppression</span>');
    expect(html).toContain('>Webcam</span>');
    expect(html).toContain('>Quality preset</span>');
    expect(html).toContain('>Cursor</span>');
  });

  test('should keep every media control', () => {
    const html = renderDevices();

    for (const label of [
      'Voice-only mode',
      'Echo Cancellation',
      'Automatic gain control',
      'Noise Gate',
      'Mirror Own Video',
      'Simulcast (webcam)',
      'Direct media (P2P)',
      'Simulcast (screen share)'
    ]) {
      expect(html).toContain(`aria-label="${label}"`);
    }

    // the two rows that need a browser feature keep their own control
    expect(html).toContain('>Restrict Own Audio</span>');
    expect(html).toContain('>Suppress Local Audio Playback</span>');

    expect(html.match(/role="switch"/g)?.length).toBe(8);
  });

  test('should keep the device tests and the camera preview', () => {
    const html = renderDevices();

    expect(html).toContain('Microphone Test');
    expect(html).toContain('Permit Microphone Access');
    expect(html).toContain('Start Test');
    expect(html).toContain('Start Video Preview');
    expect(html).toContain(
      'group relative h-[140px] w-full overflow-hidden rounded-[8px] bg-panel'
    );
  });

  test('should keep the direct media meaning and its consent', () => {
    const html = renderDevices();

    expect(html).toContain('Direct media (P2P)');
    expect(html).toContain('two-person call');
    expect(html).toContain('Your peers can see your IP address.');
  });

  test('should disable the simulcast while the server has it off', () => {
    const html = renderDevices();

    expect(html).toContain('Simulcast is disabled on this server.');
    expect(isSwitchDisabled(html, 'Simulcast (webcam)')).toBe(true);
    expect(isSwitchDisabled(html, 'Simulcast (screen share)')).toBe(true);
  });

  test('should enable the simulcast while the server allows it', () => {
    const html = renderDevices('simulcast');

    expect(html).not.toContain('Simulcast is disabled on this server.');
    expect(isSwitchDisabled(html, 'Simulcast (webcam)')).toBe(false);
    expect(isSwitchDisabled(html, 'Simulcast (screen share)')).toBe(false);
  });
});
