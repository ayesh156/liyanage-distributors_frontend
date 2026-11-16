import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// ── Graceful Dynamic Import / Chunk Load Handler ───────────────────
// Reliance 'Zero-Reinstall' Architecture: Avoid forcefully hard-reloading
// the browser upon detecting a new asset chunk, which would destroy active
// in-flight billing sessions and unsaved van reconciliation sheets.
// Instead, mark update as pending in sessionStorage and defer execution.
window.addEventListener('error', (e) => {
  const isChunkError =
    e.message?.includes('Failed to fetch dynamically imported module') ||
    e.message?.includes('ChunkLoadError') ||
    e.message?.includes('error loading dynamically imported module');

  if (isChunkError) {
    console.warn('[PWA Update] New application build detected. Update queued gracefully for next session.');
    sessionStorage.setItem('lhdd_pwa_update_pending', 'true');
    // Dispatch custom event to notify UI components non-intrusively without reload
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }
}, true);

// ── Graceful Service Worker Registration ('Zero-Reinstall') ────────
// Registers sw.js with background cache invalidation in production only.
// In local development (Vite HMR), prevents service workers from intercepting
// dynamic module chunks, eliminating stale chunk collisions and duplicate React instances.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for worker updates in the background
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (
                installingWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                console.log(
                  '[PWA] New build cached in background. Ready for next session without forced reload.'
                );
                sessionStorage.setItem('lhdd_pwa_update_pending', 'true');
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  } else {
    // Development mode: unregister any lingering service workers and flush cache
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
