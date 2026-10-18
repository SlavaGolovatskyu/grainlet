import { render } from 'grainlet';
import { AuthProvider } from 'grainlet/auth';
import { I18nProvider } from 'grainlet/i18n';
import { QueryClientProvider } from 'grainlet/query';
import { App } from './App.jsx';
import { auth } from './auth.js';
import { i18n } from './i18n.js';
import { queryClient } from './query.js';

function Root() {
  return (
    <AuthProvider client={auth}>
      <I18nProvider client={i18n}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </I18nProvider>
    </AuthProvider>
  );
}

render(Root, document.getElementById('app'));
