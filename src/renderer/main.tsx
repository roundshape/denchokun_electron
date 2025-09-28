import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const isDev = import.meta.env.DEV;
const enableStrictMode = false; // APIの重複実行を避けるため無効化

ReactDOM.createRoot(document.getElementById('root')!).render(
  enableStrictMode ? (
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  ) : (
    <HashRouter>
      <App />
    </HashRouter>
  )
);