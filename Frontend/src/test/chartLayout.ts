import { beforeEach, afterEach, vi } from 'vitest';
// jsdom has no layout engine. Supply chart-container geometry for data tests only.
export function chartLayout() {
  const original = HTMLElement.prototype.getBoundingClientRect;
  let restore: (() => void) | undefined;
  beforeEach(() => {
    const spy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('recharts-responsive-container')
          ? new DOMRect(0, 0, 640, 210)
          : original.call(this);
      });
    restore = () => spy.mockRestore();
  });
  afterEach(() => restore?.());
}
