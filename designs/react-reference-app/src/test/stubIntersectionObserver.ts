import { afterAll, beforeAll, vi } from 'vitest';

class IntersectionObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

export function stubIntersectionObserver() {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });
}
