/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5317,
    // File-change events don't always arrive (e.g. inside a sandbox); polling makes edits show up reliably.
    watch: { usePolling: true, interval: 300 },
  },
  // The tests simulate whole semesters; on a busy machine they can take longer than vitest's 5 s default.
  test: { testTimeout: 120_000 },
});
