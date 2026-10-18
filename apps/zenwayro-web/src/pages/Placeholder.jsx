import { useLocation } from 'grainlet/route';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { translateApp } from '../i18n.js';

export function Placeholder(props) {
  const location = useLocation();
  const session = useSession();
  const i18n = useI18n();

  return (
    <section>
      <h1>{props.title}</h1>
      <p class="current-route">{location().pathname}</p>
      <p>{session.status()}</p>
      <p>{translateApp(i18n, 'nav.planTrip')}</p>
    </section>
  );
}
