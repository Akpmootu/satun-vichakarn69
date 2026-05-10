import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || '';
  if (msg.includes('Failed to fetch dynam')) {
    console.warn("Caught dynamic import failure. Reloading...");
    window.location.reload();
  } else if (msg.includes('Refresh Token Not Found') || msg.includes('Invalid Refresh Token')) {
    console.warn("Supabase auth session expired or invalid. Clearing session...");
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('svk_supabase_user');
    event.preventDefault(); // Prevent bubbling to console as an unhandled error if possible
  } else if (msg.includes('Failed to fetch')) {
    // Only warn, do not reload, as this can happen for API errors
    console.warn("Caught Failed to fetch error:", event.reason);
    event.preventDefault();
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