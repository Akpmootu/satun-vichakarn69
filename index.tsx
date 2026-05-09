import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch')) {
    console.warn("Caught fetch error, likely dynamic import failure during dev server restart/HMR. Reloading...");
    // Auto reload to recover from stale chunks
    window.location.reload();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);