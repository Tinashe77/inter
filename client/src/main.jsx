import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import './styles.css';
import { checkRegisteredDevice } from './devices/deviceRegistry.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Check an existing SLIS device registration on every PWA launch without
// blocking the interface during a temporary SLIS outage.
checkRegisteredDevice().catch(() => {});
