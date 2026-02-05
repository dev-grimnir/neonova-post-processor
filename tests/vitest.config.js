// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enables DOM environment (document, DOMParser, window, etc.)
    environment: 'jsdom',

    // Makes describe, it, expect, beforeEach global (no imports needed)
    globals: true,

    // Where to look for test files
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],

    // Optional: if you want coverage reports later
    // coverage: {
    //   provider: 'v8',
    //   reporter: ['text', 'json', 'html'],
    // },
  },
});
