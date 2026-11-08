import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

// jsdom doesn't implement matchMedia — fx components and the theme lib query it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// framer-motion's useInView needs IntersectionObserver (BlurFade in the UI).
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  class FakeIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  // @ts-expect-error test polyfill
  window.IntersectionObserver = FakeIntersectionObserver;
  // @ts-expect-error test polyfill
  globalThis.IntersectionObserver = FakeIntersectionObserver;
}
