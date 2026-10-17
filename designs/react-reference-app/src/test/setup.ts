// The mocked check-ins and calls are written in the coach's wall-clock hours and the
// clash rules compare them in her zone, so the test clock runs there on every machine.
process.env.TZ = 'Europe/Bucharest';

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

// jsdom has no pointer-capture API; Radix's Select (and other primitives
// built on it) call these during pointer interaction.
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

afterEach(() => {
  cleanup();
});
