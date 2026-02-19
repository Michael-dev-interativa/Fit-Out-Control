import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Silence verbose console methods in production to reduce bundle noise
if (import.meta.env && import.meta.env.PROD) {
    // preserve warn/error
    console.log = () => { };
    console.debug = () => { };
    console.info = () => { };
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)