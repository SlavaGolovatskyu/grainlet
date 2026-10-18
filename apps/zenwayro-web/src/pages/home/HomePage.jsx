import { createMemo, For, onMount, Show, Switch, Match } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { Link } from 'grainlet/route';
import { apiClient } from '../../api/client.js';
import { AUTH_PATHS } from '../../api/paths/auth.js';
import { POPULAR_TRIP_PATHS } from '../../api/paths/popular-trip.js';
import { translateApp } from '../../i18n.js';
import {
  ROUTE_AUTH_SIGNIN,
  ROUTE_HOME,
  ROUTE_POPULAR_TRIPS,
} from '../../routes.js';
import {
  HOME_HERO_IMAGE,
  HOME_ICONS,
  HOME_LANDING_FEATURES,
  HOME_SOCIAL_STATS,
  buildHomePopularTripCard,
  homeFeatureIconName,
  homePlanCard,
  homePopularTripsPhase,
  homePopularTripsQueryKey,
  homePopularTripsQueryParams,
  homePrimaryCta,
  isHomeSessionAuthenticated,
  readPopularTripItems,
} from './homeContent.js';

const HERO_PRIMARY_CLASS =
  'inline-flex items-center justify-center gap-2 h-auto w-full rounded-2xl border-0 py-6 text-base font-semibold text-white shadow-lg shadow-orange-900/30 coral-gradient hover:opacity-90';
const HERO_SECONDARY_CLASS =
  'inline-flex items-center justify-center gap-2 h-auto w-full rounded-2xl border border-white/40 bg-white/10 py-6 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20';
const PLAN_CTA_CLASS =
  'inline-flex items-center justify-center gap-2 h-auto w-full rounded-xl border-0 py-5 text-sm font-semibold text-white coral-gradient hover:opacity-90';
const BRAND_CLASS =
  'flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xl !text-xl !font-bold tracking-tight !text-white';

function createHomeIcon(name, options) {
  const spec = HOME_ICONS[name];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(options.size ?? 16));
  svg.setAttribute('height', String(options.size ?? 16));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', options.filled ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const className = ['shrink-0', options.className].filter(Boolean).join(' ');
  if (className) svg.setAttribute('class', className);
  if (!spec) return svg;
  for (const shape of spec.shapes) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', shape.tag);
    for (const [key, value] of Object.entries(shape.attrs)) {
      node.setAttribute(key, value);
    }
    svg.appendChild(node);
  }
  return svg;
}

function readIconProp(value) {
  return typeof value === 'function' ? value() : value;
}

function Icon(props) {
  let host;
  onMount(() => {
    if (!host) return;
    host.replaceChildren(
      createHomeIcon(readIconProp(props.name), {
        size: readIconProp(props.size),
        className: readIconProp(props.class),
        filled: readIconProp(props.filled),
      })
    );
  });
  return <span class="contents" ref={(node) => { host = node; }} />;
}

function daysLabel(t, days) {
  if (!days) return '';
  return days.variables ? t(days.key, days.variables) : t(days.key);
}

function HomeHero(props) {
  const t = props.t;
  return (
    <section class="relative flex min-h-[70vh] flex-col justify-end overflow-hidden">
      <div class="absolute inset-0">
        <img class="h-full w-full object-cover" src={HOME_HERO_IMAGE} alt="" />
        <div class="voyage-gradient absolute inset-0 opacity-70" />
      </div>

      <div class="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 pt-4">
        <div class="flex items-center gap-2">
          <div class="coral-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <Icon name="map" size={16} class="text-white" />
          </div>
          <Link href={ROUTE_HOME} class={BRAND_CLASS} activeClass="">
            {t('common.appName')}
          </Link>
        </div>
        <Show
          when={props.authenticated()}
          fallback={
            <Link
              href={ROUTE_AUTH_SIGNIN}
              class="text-sm font-medium text-white/80"
              activeClass=""
            >
              {t('nav.signIn')}
            </Link>
          }
        >
          <button
            type="button"
            class="text-sm font-medium text-white/80"
            onClick={props.onSignOut}
          >
            {t('nav.signOut')}
          </button>
        </Show>
      </div>

      <div class="relative z-10 px-5 pb-8">
        <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-[#ff8a70]">
          {t('home.premiumTagline')}
        </p>
        <h1 class="mb-4 text-4xl font-bold leading-tight text-white">
          {t('home.heroTitlePre')}
          <br />
          {t('home.heroTitleHighlight')}
          <br />
          <span class="text-[#ff6b4a]">{t('home.heroTitlePost')}</span>
        </h1>
        <p class="mb-8 text-base leading-relaxed text-white/70">
          {t('home.landingHeroSubtitle')}
        </p>

        <div class="flex flex-col gap-3">
          <Link href={props.cta().href} class={HERO_PRIMARY_CLASS} activeClass="">
            <span>{t(props.cta().labelKey)}</span>
            <Icon name="chevronRight" size={18} class="ml-1 text-white" />
          </Link>
          <Link href={ROUTE_POPULAR_TRIPS} class={HERO_SECONDARY_CLASS} activeClass="">
            {t('nav.popularTrips')}
          </Link>
        </div>
      </div>
    </section>
  );
}

function HomePlanCard(props) {
  const t = props.t;
  const card = createMemo(() => homePlanCard(props.authenticated()));
  return (
    <div class="relative z-20 -mt-4 px-5">
      <div class="rounded-3xl border border-border bg-card p-5 shadow-xl shadow-[#0f1b3d]/10">
        <div class="mb-3 flex items-center gap-3">
          <div class="coral-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
            <Icon name="star" size={18} class="text-white" />
          </div>
          <div>
            <h3 class="text-base font-bold text-foreground">{t(card().titleKey)}</h3>
            <p class="mt-0.5 text-xs text-muted-foreground">{t(card().subtitleKey)}</p>
          </div>
        </div>
        <div class="mb-4 flex flex-wrap gap-2">
          <For each={card().tagKeys}>
            {(tagKey) => (
              <span class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {t(tagKey)}
              </span>
            )}
          </For>
        </div>
        <Link href={props.cta().href} class={PLAN_CTA_CLASS} activeClass="">
          {t(props.cta().labelKey)}
          <Icon name="arrowRight" size={16} class="ml-1.5 text-white" />
        </Link>
      </div>
    </div>
  );
}

function HomeTripCard(props) {
  const card = props.card;
  const t = props.t;
  return (
    <Link
      href={card.href}
      class="relative h-56 w-44 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-md"
      activeClass=""
    >
      <Show
        when={card.heroUrl}
        fallback={
          <div class="flex h-full w-full items-center justify-center bg-[#1e3a5f] text-3xl font-bold text-white">
            {card.title.charAt(0)}
          </div>
        }
      >
        <img src={card.heroUrl} alt="" class="h-full w-full object-cover" />
      </Show>
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div class="absolute bottom-0 left-0 right-0 p-3">
        <p class="text-base font-bold text-white">{card.title}</p>
        <span class="mt-1 inline-block rounded-full bg-[#ff6b4a]/90 px-2 py-0.5 text-xs font-semibold text-white">
          {daysLabel(t, card.days)}
        </span>
      </div>
    </Link>
  );
}

function HomePopularTrips(props) {
  const t = props.t;
  const trips = props.trips;
  const cards = createMemo(() =>
    readPopularTripItems(trips.data()).map((trip) => buildHomePopularTripCard(trip))
  );
  const phase = createMemo(() =>
    homePopularTripsPhase({
      isPending: trips.isPending(),
      isError: trips.isError(),
      itemCount: cards().length,
    })
  );

  return (
    <section class="mt-8 px-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-bold text-foreground">{t('nav.popularTrips')}</h2>
        <Link href={ROUTE_POPULAR_TRIPS} class="text-sm font-medium text-[#3b6fa0]" activeClass="">
          {t('home.seeAll')}
        </Link>
      </div>
      <Switch>
        <Match when={phase() === 'loading'}>
          <p class="text-sm text-muted-foreground" role="status">
            {t('popularTrips.loading')}
          </p>
        </Match>
        <Match when={phase() === 'error'}>
          <div role="alert">
            <p class="text-sm text-muted-foreground">{t('popularTrips.loadError')}</p>
            <button
              type="button"
              class="mt-2 text-sm font-medium text-[#3b6fa0]"
              onClick={() => trips.refetch()}
            >
              {t('common.tryAgain')}
            </button>
          </div>
        </Match>
        <Match when={phase() === 'empty'}>
          <p class="text-sm text-muted-foreground" role="status">
            {t('popularTrips.emptyState')}
          </p>
        </Match>
        <Match when={phase() === 'ready'}>
          <div class="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            <For each={cards()}>
              {(card) => <HomeTripCard card={card} t={t} />}
            </For>
          </div>
        </Match>
      </Switch>
    </section>
  );
}

function HomeFeatures(props) {
  const t = props.t;
  return (
    <section class="mt-10 px-5">
      <h2 class="mb-5 text-xl font-bold text-foreground">{t('home.whyZenwayro')}</h2>
      <div class="flex flex-col gap-4">
        <For each={HOME_LANDING_FEATURES}>
          {(feature) => (
            <div class="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
              <div class={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${feature.iconClass}`}>
                <Icon name={homeFeatureIconName(feature.iconKey)} size={20} class="text-white" />
              </div>
              <div>
                <h3 class="mb-1 text-base font-bold text-foreground">{t(feature.titleKey)}</h3>
                <p class="text-sm leading-relaxed text-muted-foreground">{t(feature.descKey)}</p>
              </div>
            </div>
          )}
        </For>
      </div>
    </section>
  );
}

function HomeSocialProof(props) {
  const t = props.t;
  return (
    <section class="mx-5 mb-4 mt-8 rounded-3xl p-5 text-center voyage-gradient">
      <div class="mb-2 flex justify-center gap-1">
        <For each={[0, 1, 2, 3, 4]}>
          {() => <Icon name="star" size={16} filled class="fill-[#ff6b4a] text-[#ff6b4a]" />}
        </For>
      </div>
      <p class="mb-1 text-sm font-medium text-white/90">“{t('home.socialProofQuote')}”</p>
      <p class="text-xs text-white/50">— {t('home.socialProofAuthor')}</p>
      <div class="mt-4 flex justify-center gap-4 border-t border-white/10 pt-4">
        <For each={HOME_SOCIAL_STATS}>
          {(stat, index) => (
            <>
              <Show when={readIndex(index) > 0}>
                <div class="w-px bg-white/20" />
              </Show>
              <div class="text-center">
                <p class="text-xl font-bold text-white">{stat.value}</p>
                <p class="text-xs text-white/60">{t(stat.labelKey)}</p>
              </div>
            </>
          )}
        </For>
      </div>
    </section>
  );
}

function readIndex(index) {
  const value = typeof index === 'function' ? index() : index;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function HomePage() {
  const session = useSession();
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const authenticated = createMemo(() =>
    isHomeSessionAuthenticated(session.status(), session.data())
  );
  const cta = createMemo(() => homePrimaryCta(authenticated()));
  const trips = useQuery(() => ({
    queryKey: homePopularTripsQueryKey(),
    queryFn: ({ signal }) =>
      apiClient.get(POPULAR_TRIP_PATHS.root, {
        params: homePopularTripsQueryParams(),
        signal,
      }),
  }));

  async function signOut() {
    try {
      await apiClient.post(AUTH_PATHS.logout);
    } catch {
      // Ignore backend errors (token may already be invalid).
    }
    await session.signOut();
  }

  return (
    <div class="zenwayro-v2-ui min-h-full bg-background">
      <HomeHero t={t} authenticated={authenticated} cta={cta} onSignOut={signOut} />
      <HomePlanCard t={t} authenticated={authenticated} cta={cta} />
      <HomePopularTrips t={t} trips={trips} />
      <HomeFeatures t={t} />
      <HomeSocialProof t={t} />
    </div>
  );
}
