import { render } from 'grainlet';
import { AuthProvider } from 'grainlet/auth';
import { I18nProvider } from 'grainlet/i18n';
import { App } from './App.jsx';
import { auth } from './auth.js';
import { i18n } from './i18n.js';

function Root() {
  return (
    <AuthProvider client={auth}>
      <I18nProvider client={i18n}>
        <App />
      </I18nProvider>
    </AuthProvider>
  );
}

render(Root, document.getElementById('app'));
