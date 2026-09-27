/**
 * Entry point (bundled by esbuild into dist/main.js).
 */
import { startApp } from './app/app.ts';

if (__DEV__) {
  // Live reload: esbuild's dev server emits `change` after every rebuild. If the dev server
  // stops, close the stream instead of letting it retry (and log errors) forever.
  const events = new EventSource('/esbuild');
  events.addEventListener('change', () => location.reload());
  events.addEventListener('error', () => events.close());
}

startApp(document);
