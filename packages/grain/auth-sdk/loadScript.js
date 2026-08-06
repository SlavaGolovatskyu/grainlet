import { AuthSdkError } from './errors.js';

const scriptLoads = new Map();

export function loadScript(src, options = {}) {
  if (typeof document === 'undefined') {
    return Promise.reject(
      new AuthSdkError('OAuth scripts can only be loaded in a browser.', {
        code: 'BrowserUnavailable',
      })
    );
  }

  if (scriptLoads.has(src)) return scriptLoads.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find(
      (script) => script.src === src
    );
    const script = existing ?? document.createElement('script');
    let timeoutId;

    function cleanup() {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      if (timeoutId) clearTimeout(timeoutId);
    }

    function handleLoad() {
      cleanup();
      resolve(script);
    }

    function handleError() {
      cleanup();
      scriptLoads.delete(src);
      reject(
        new AuthSdkError(`Failed to load OAuth script: ${src}`, {
          code: 'ScriptLoadError',
        })
      );
    }

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    timeoutId = setTimeout(handleError, options.timeoutMs ?? 15_000);

    if (!existing) {
      script.src = src;
      script.async = true;
      script.defer = true;
      if (options.id) script.id = options.id;
      document.head.appendChild(script);
    } else if (existing.dataset.grainletLoaded === 'true') {
      handleLoad();
    }
  });

  scriptLoads.set(src, promise);
  promise.then(
    (script) => {
      script.dataset.grainletLoaded = 'true';
    },
    () => {}
  );
  return promise;
}
