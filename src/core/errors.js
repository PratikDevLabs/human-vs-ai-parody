// Global error handling: non-blocking toast, game keeps running.
import { bus } from './bus.js';

export function initErrorHandling() {
  window.addEventListener('error', (e) => {
    console.error('[onerror]', e.message);
    bus.emit('ui:error', e.message || 'Something went wrong');
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[unhandledrejection]', e.reason);
    bus.emit('ui:error', (e.reason && e.reason.message) || 'Async error');
  });
}
