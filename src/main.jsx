import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './App.css';
import App from './App.jsx';
import '@fortawesome/fontawesome-free/css/all.min.css';

// ==== SENTRY INITIALIZATION (FIRST) ====
async function initializeSentry() {
  if (import.meta.env.MODE === 'production') {
    try {
      const Sentry = await import('@sentry/react');
      const { browserTracingIntegration, replayIntegration } = Sentry;

      Sentry.init({
        dsn: "https://3b06f915a2001e746af89a3490e3421f@o4510108172812288.ingest.us.sentry.io/4510108174843904",
        integrations: [
          browserTracingIntegration(),
          replayIntegration(),
        ],
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        sendDefaultPii: true,
        debug: false,
        beforeSend(event, hint) {
          // Filter out certain errors if needed
          return event;
        },
      });

      window.Sentry = Sentry;
      return Sentry;
    } catch (err) {
      console.error('Failed to initialize Sentry:', err);
    }
  }
  return null;
}

// ==== PRODUCTION ERROR SUPPRESSION ====
function setupProductionErrorHandling(Sentry) {
  if (import.meta.env.MODE === 'production') {
    
    const originalConsole = { ...console };

    // Override console methods after Sentry is initialized
    Object.keys(console).forEach(method => {
      console[method] = () => { };
    });

    // Intercept fetch to catch API errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Log API errors to Sentry but suppress console
        if (!response.ok) {
          const error = new Error(`API Error: ${response.status} ${response.statusText}`);
          error.url = args[0];
          error.status = response.status;

          if (Sentry) {
            Sentry.captureException(error, {
              tags: {
                type: 'api_error',
                status: response.status,
                url: args[0]
              }
            });
          }
        }

        return response;
      } catch (error) {
      
        if (Sentry) {
          Sentry.captureException(error, {
            tags: {
              type: 'network_error',
              url: args[0]
            }
          });
        }
        throw error;
      }
    };

    // If using axios, also intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      this._url = url;
      this._method = method;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener('load', function () {
        if (this.status >= 400) {
          const error = new Error(`API Error: ${this.status} ${this.statusText}`);
          error.url = this._url;
          error.status = this.status;

          if (Sentry) {
            Sentry.captureException(error, {
              tags: {
                type: 'xhr_api_error',
                status: this.status,
                url: this._url,
                method: this._method
              }
            });
          }
        }
      });

      this.addEventListener('error', function () {
        const error = new Error(`Network Error: ${this._url}`);
        error.url = this._url;

        if (Sentry) {
          Sentry.captureException(error, {
            tags: {
              type: 'xhr_network_error',
              url: this._url,
              method: this._method
            }
          });
        }
      });

      return originalXHRSend.apply(this, args);
    };

    // Safe wrapper for async functions
    const safeWrap = fn => {
      return function (...args) {
        try {
          const result = fn.apply(this, args);
          if (result && typeof result.catch === 'function') {
            return result.catch(err => {
              if (Sentry) {
                Sentry.captureException(err);
              }
              throw err;
            });
          }
          return result;
        } catch (err) {
          if (Sentry) {
            Sentry.captureException(err);
          }
          throw err;
        }
      };
    };

    // Wrap setTimeout and setInterval
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;

    window.setTimeout = (fn, delay, ...args) => {
      return originalSetTimeout(safeWrap(fn), delay, ...args);
    };

    window.setInterval = (fn, delay, ...args) => {
      return originalSetInterval(safeWrap(fn), delay, ...args);
    };

    // Global error handlers
    window.onerror = function (message, source, lineno, colno, error) {
      if (Sentry && error) {
        Sentry.captureException(error);
      }
      return true;
    };

    window.onunhandledrejection = function (event) {
      if (Sentry && event.reason) {
        Sentry.captureException(event.reason);
      }
      event.preventDefault();
    };
  }
}

// ==== INITIALIZE AND RENDER ====
initializeSentry().then((Sentry) => {
  setupProductionErrorHandling(Sentry);

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
