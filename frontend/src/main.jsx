import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './Theme.jsx';
import './styles.css';
import './dark-mode.css';
import './projects.css';
import './design-system.css';
import './atlas.css';
createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>,
);
