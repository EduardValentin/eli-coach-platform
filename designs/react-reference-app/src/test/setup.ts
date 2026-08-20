import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom has no ResizeObserver; Radix primitives (checkbox, etc.) require it.
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// jsdom implements no scrolling; components that reveal a section after a
// selection call scrollIntoView on it.
Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
});
