import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'

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