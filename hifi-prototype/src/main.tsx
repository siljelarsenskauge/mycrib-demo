import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { InstallHint } from './components/InstallHint';
import { StoreProvider } from './state/store';
import './styles/tokens.css';
import './styles/app.css';
import './styles/chic.css';
import './styles/tokens-chic.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
      <InstallHint />
    </StoreProvider>
  </StrictMode>,
);
