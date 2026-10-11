import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Toaster from './components/ui/Toaster.jsx';
import { toast } from './store/toastStore.js';
import 'highlight.js/styles/github-dark.css';
import './index.css';

window.addEventListener('offline', () => toast.error('You are offline. Messages will not send until you reconnect.'));
window.addEventListener('online', () => toast.success('Back online.'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster />
    </ErrorBoundary>
  </StrictMode>,
);
