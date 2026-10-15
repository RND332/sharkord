import { useScrollController } from '@/components/channel-view/text/hooks/use-scroll-controller';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';

for (const readerScrolledUp of [false, true]) {
  test(
    readerScrolledUp
      ? 'content resize after latest-page refresh preserves a scrolled-up reader'
      : 'content resize after latest-page refresh preserves bottom lock',
    async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const root = createRoot(host);
      const messages = [1];
      const Fixture = ({ fetching }: { fetching: boolean }) => {
        const { bindContainer, onScroll } = useScrollController({
          messages,
          fetching,
          hasMore: false,
          loadMore: async () => undefined
        });
        return createElement(
          'div',
          {
            ref: bindContainer,
            onScroll,
            'data-fetching': String(fetching),
            style: { height: 240, width: 300, overflowY: 'auto' }
          },
          createElement('div', { style: { height: 1000 } }, 'Media content')
        );
      };

      try {
        root.render(createElement(Fixture, { fetching: true }));
        await expect.poll(() => host.firstElementChild).not.toBeNull();
        const container = host.firstElementChild as HTMLDivElement;
        const fromBottom = () =>
          container.scrollHeight - container.scrollTop - container.clientHeight;
        await expect.poll(fromBottom).toBe(0);

        root.render(createElement(Fixture, { fetching: false }));
        await expect.poll(() => container.dataset.fetching).toBe('false');
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (readerScrolledUp) {
          container.scrollTop = 200;
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          );
        }

        (container.firstElementChild as HTMLDivElement).style.height = '2000px';
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );

        if (readerScrolledUp) {
          expect(container.scrollTop).toBe(200);
        } else {
          await expect.poll(fromBottom, { timeout: 1000 }).toBe(0);
        }
      } finally {
        root.unmount();
        host.remove();
      }
    }
  );
}

test('content mounted after a loading skeleton keeps following late resize', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const messages = [1];
  const Fixture = ({ visible }: { visible: boolean }) => {
    const { bindContainer, onScroll } = useScrollController({
      messages,
      fetching: !visible,
      hasMore: false,
      loadMore: async () => undefined
    });
    return visible
      ? createElement(
          'div',
          {
            ref: bindContainer,
            onScroll,
            style: { height: 240, width: 300, overflowY: 'auto' }
          },
          createElement('div', { style: { height: 1000 } }, 'Media content')
        )
      : createElement('span', null, 'Loading');
  };
  try {
    root.render(createElement(Fixture, { visible: false }));
    await expect.poll(() => host.textContent).toBe('Loading');
    root.render(createElement(Fixture, { visible: true }));
    await expect.poll(() => host.querySelector('div')).not.toBeNull();
    const container = host.firstElementChild as HTMLDivElement;
    const fromBottom = () =>
      container.scrollHeight - container.scrollTop - container.clientHeight;
    await expect.poll(fromBottom).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 100));
    (container.firstElementChild as HTMLDivElement).style.height = '2000px';
    await expect.poll(fromBottom, { timeout: 1000 }).toBe(0);
  } finally {
    root.unmount();
    host.remove();
  }
});
