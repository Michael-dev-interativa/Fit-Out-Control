import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'

// Ensure deep links resolve in hash-based routing when index.html is served.
if (typeof window !== 'undefined' && !window.location.hash && window.location.pathname !== '/') {
    const target = `/#${window.location.pathname}${window.location.search}`;
    window.location.replace(target);
}

// One-time cache migration: clears stale SW caches from older deployments.
if (import.meta.env && import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const swMigrationKey = 'fitout-sw-reset-2026-04-07';
    window.addEventListener('load', async () => {
        try {
            if (localStorage.getItem(swMigrationKey) === 'done') return;

            const registrations = await navigator.serviceWorker.getRegistrations();
            if (registrations.length === 0) {
                localStorage.setItem(swMigrationKey, 'done');
                return;
            }

            await Promise.all(registrations.map((registration) => registration.unregister()));
            localStorage.setItem(swMigrationKey, 'done');
            window.location.reload();
        } catch {
            // Ignore migration failures and continue app bootstrap.
        }
    });
}

// Silence verbose console methods in production to reduce bundle noise
if (import.meta.env && import.meta.env.PROD) {
    // preserve warn/error
    console.log = () => { };
    console.debug = () => { };
    console.info = () => { };
}

// Force app updates to avoid stale cached chunks from older releases.
if (import.meta.env && import.meta.env.PROD) {
    const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
            updateSW(true);
            window.location.reload();
        },
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)