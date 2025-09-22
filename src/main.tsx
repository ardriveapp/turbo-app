import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

// Temporary: Suppress Privy's DOM nesting warnings
// TODO: Remove when Privy fixes their modal components
import { suppressPrivyDOMWarnings } from './utils/suppressPrivyWarnings';
suppressPrivyDOMWarnings();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);