import { createEffect, createSignal, For, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { Link } from 'grainlet/route';
import { apiClient, POPULAR_TRIP_PATHS, USERS_PATHS } from '../../api.js';
import {
  AdminShell,
  adminText,
  buttonClass,
  DataRegion,
  Notice,
  panelClass,
  secondaryButtonClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import {
  errorText,
  GENERATION_POLL_MS,
  isGenerationJobActive,
  setGenerationIncludeRoutes,
  updateGenerationConfig,
  visibleAdminNavLinks,
} from './admin-helpers.js';

export function AdminHomePage() {
  const access = useAdminAccess('hub');
  const i18n = useI18n();
  const t = (key, fallback, variables) => adminText(i18n, key, fallback, variables);
  return (
    <AdminShell
      access={access}
      title={t('nav.admin', 'Admin')}
      description={t('admin.hubIntro', 'Use this page as a navigation hub for all admin tooling.')}
    >
      <AdminHomeBody access={access} />
    </AdminShell>
  );
}

function AdminHomeBody(props) {
  const i18n = useI18n();
  const t = (key, fallback, variables) => adminText(i18n, key, fallback, variables);
  const cards = () => visibleAdminNavLinks(props.access.profile.data()).filter((link) => link.href !== '/admin');
  const isAdmin = () => props.access.profile.data()?.isAdmin === true;
  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <For each={cards()}>
          {(link) => (
            <Link href={link.href} class={`${panelClass} block hover:border-indigo-500`}>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                {adminText(i18n, link.titleKey, link.title)}
              </h2>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{link.description}</p>
            </Link>
          )}
        </For>
      </div>
      <Show when={cards().length === 0}>
        <p class="text-sm text-gray-500">{t('admin.noTools', 'No admin tools are available for this account.')}</p>
      </Show>
      <Show when={isAdmin()}>
        <UserStats />
        <PopularTripGeneration />
        <CleanupExpired />
      </Show>
    </div>
  );
}

function UserStats() {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const stats = useQuery(() => ({
    queryKey: ['users', 'admin', 'stats'],
    queryFn: ({ signal }) => apiClient.get(USERS_PATHS.adminStats, { signal }),
  }));
  return (
    <div class={panelClass}>
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">{t('admin.userStats', 'User stats')}</h2>
      <DataRegion
        pending={stats.isPending()}
        error={stats.error()}
        errorFallback={t('admin.statsError', 'Could not load user stats.')}
        empty={false}
      >
        <p class="mt-2 text-sm text-gray-700 dark:text-gray-200">
          {t('admin.dailyActiveUsers', 'Daily active users')}: {stats.data()?.dailyActiveUsers ?? 0}
        </p>
      </DataRegion>
    </div>
  );
}

function PopularTripGeneration() {
  const i18n = useI18n();
  const client = useQueryClient();
  const t = (key, fallback, variables) => adminText(i18n, key, fallback, variables);
  const [config, setConfig] = createSignal(null);
  const [message, setMessage] = createSignal('');
  const [showConfirm, setShowConfirm] = createSignal(false);
  const [jobId, setJobId] = createSignal(null);
  const [poll, setPoll] = createSignal(false);

  const preview = useQuery(() => ({
    queryKey: ['popular-trips', 'admin', 'generation-preview'],
    queryFn: ({ signal }) => apiClient.get(POPULAR_TRIP_PATHS.adminGenerationPreview, { signal }),
  }));

  createEffect(() => {
    const defaults = preview.data()?.defaults;
    if (defaults && !config()) setConfig(defaults);
  });

  const job = useQuery(() => ({
    queryKey: ['popular-trips', 'admin', 'generation-job', jobId()],
    enabled: Boolean(jobId()) && poll(),
    refetchInterval: GENERATION_POLL_MS,
    queryFn: ({ signal }) => apiClient.get(POPULAR_TRIP_PATHS.adminGenerateJob(jobId()), { signal }),
  }));

  createEffect(() => {
    const status = job.data()?.status;
    if ((status === 'completed' || status === 'failed') && poll()) {
      setPoll(false);
      preview.refetch();
      client.invalidateQueries({ queryKey: ['popular-trips', 'admin', 'generation-preview'] });
    }
  });

  const start = useMutation({
    mutationFn: (body) => apiClient.post(POPULAR_TRIP_PATHS.adminGenerate, body),
    onSuccess: (data) => {
      setJobId(data.jobId);
      setPoll(true);
      setShowConfirm(false);
      setMessage('');
    },
    onError: (error) => {
      if (error?.status === 409 && typeof error?.data?.jobId === 'string') {
        setJobId(error.data.jobId);
        setPoll(true);
        setShowConfirm(false);
        setMessage(t('adminPanel.popularTripGenerationJobInProgress', 'A generation job is already running.'));
        return;
      }
      setShowConfirm(false);
      setMessage(errorText(error, t('adminPanel.popularTripGenerationFailed', 'Failed to start or complete generation.')));
    },
  });

  const current = () => config() ?? preview.data()?.defaults ?? null;
  const running = () => start.isPending() || isGenerationJobActive(job.data()?.status);

  function onStart() {
    if ((preview.data()?.pending ?? 0) === 0) {
      setMessage(t('adminPanel.popularTripGenerationNothingPending', 'Nothing to generate — all eligible cities already have both curated trips.'));
      return;
    }
    setMessage('');
    setShowConfirm(true);
  }

  function changeStrategy(strategy, field, raw) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setConfig(updateGenerationConfig(current(), strategy, field, value));
  }

  const summary = preview.data();
  return (
    <div class={`${panelClass} space-y-4`}>
      <div>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          {t('adminPanel.popularTripGenerationTitle', 'Generate Popular Trips')}
        </h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('adminPanel.popularTripGenerationDescription', 'Automatically create and publish curated trips for every city with POIs.')}
        </p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('adminPanel.popularTripGenerationOneTimeRule', 'Each city and strategy is generated only once.')}
        </p>
      </div>
      <DataRegion
        pending={preview.isPending()}
        error={preview.error()}
        errorFallback={t('adminPanel.popularTripGenerationFailed', 'Failed to start or complete generation.')}
        empty={!summary}
        emptyText={t('admin.emptyPreview', 'No generation preview is available.')}
      >
        <p class="text-sm text-gray-700 dark:text-gray-200">
          {t('adminPanel.popularTripGenerationPreview', '{eligible} eligible cities · {pending} trips pending · {generated} already published', {
            eligible: summary?.eligibleCities ?? 0,
            pending: summary?.pending ?? 0,
            generated: summary?.alreadyGenerated?.total ?? 0,
          })}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {t('adminPanel.popularTripGenerationPreviewDetail', 'Published: {popularity} top highlights, {nearby} area-focused', {
            popularity: summary?.alreadyGenerated?.popularity ?? 0,
            nearby: summary?.alreadyGenerated?.nearby ?? 0,
          })}
        </p>
      </DataRegion>
      <Show when={current()}>
        {(value) => (
          <form
            class="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onStart();
            }}
          >
            <label class="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
              <input
                type="checkbox"
                checked={value.includeRoutes}
                disabled={running()}
                onChange={(event) => setConfig(setGenerationIncludeRoutes(current(), event.target.checked))}
              />
              {t('adminPanel.popularTripGenerationIncludeRoutes', 'Generate walking routes')}
            </label>
            <p class="text-xs text-gray-500">{t('adminPanel.popularTripGenerationIncludeRoutesHint', 'When enabled, pedestrian routes are computed for each day before publishing.')}</p>
            <div class="grid gap-4 sm:grid-cols-2">
              <StrategyFields
                title={t('adminPanel.popularTripGenerationPopularityTitle', 'Top highlights')}
                durationLabel={t('adminPanel.popularTripGenerationDurationDays', 'Trip duration (days)')}
                poisLabel={t('adminPanel.popularTripGenerationPoisPerDay', 'POIs per day')}
                duration={value.popularity.durationDays}
                pois={value.popularity.poisPerDay}
                disabled={running()}
                onDuration={(raw) => changeStrategy('popularity', 'durationDays', raw)}
                onPois={(raw) => changeStrategy('popularity', 'poisPerDay', raw)}
              />
              <StrategyFields
                title={t('adminPanel.popularTripGenerationNearbyTitle', 'Area-focused days')}
                durationLabel={t('adminPanel.popularTripGenerationDurationDays', 'Trip duration (days)')}
                poisLabel={t('adminPanel.popularTripGenerationPoisPerDay', 'POIs per day')}
                duration={value.nearby.durationDays}
                pois={value.nearby.poisPerDay}
                disabled={running()}
                onDuration={(raw) => changeStrategy('nearby', 'durationDays', raw)}
                onPois={(raw) => changeStrategy('nearby', 'poisPerDay', raw)}
              />
            </div>
            <Show when={showConfirm()}>
              <div class="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                <p class="text-sm text-amber-900 dark:text-amber-100">
                  {t('adminPanel.popularTripGenerationConfirm', 'Start batch generation for all pending cities? This may take several minutes.')}
                </p>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class={buttonClass}
                    disabled={start.isPending() || !current()}
                    onClick={() => current() && start.mutate(current())}
                  >
                    {start.isPending()
                      ? t('adminPanel.popularTripGenerationStarting', 'Starting...')
                      : t('adminPanel.popularTripGenerationConfirmButton', 'Start generation')}
                  </button>
                  <button type="button" class={secondaryButtonClass} disabled={start.isPending()} onClick={() => setShowConfirm(false)}>
                    {t('adminPanel.popularTripGenerationCancel', 'Cancel')}
                  </button>
                </div>
              </div>
            </Show>
            <Show when={!showConfirm()}>
              <button type="submit" class={buttonClass} disabled={running() || preview.isPending()}>
                {running()
                  ? t('adminPanel.popularTripGenerationStarting', 'Starting...')
                  : t('adminPanel.popularTripGenerationStart', 'Generate popular trips')}
              </button>
            </Show>
          </form>
        )}
      </Show>
      <Show when={job.data()}>
        {(payload) => (
          <p class="text-sm text-gray-700 dark:text-gray-200">
            {payload.status === 'completed'
              ? t('adminPanel.popularTripGenerationCompleted', 'Generation complete: {generated} created, {skipped} skipped, {failed} failed.', {
                  generated: payload.summary?.generated ?? 0,
                  skipped: payload.summary?.skipped ?? 0,
                  failed: payload.summary?.failed ?? 0,
                })
              : t('adminPanel.popularTripGenerationRunning', 'Generating... {generated} created, {skipped} skipped, {failed} failed, {pending} remaining', {
                  generated: payload.summary?.generated ?? 0,
                  skipped: payload.summary?.skipped ?? 0,
                  failed: payload.summary?.failed ?? 0,
                  pending: payload.summary?.pending ?? 0,
                })}
            <Show when={payload.error}>{(err) => <span class="text-red-600"> {err}</span>}</Show>
          </p>
        )}
      </Show>
      <Show when={job.error()}>
        {(err) => <p class="text-sm text-red-600">{errorText(err, t('adminPanel.popularTripGenerationFailed', 'Failed to start or complete generation.'))}</p>}
      </Show>
      <Notice message={message()} />
    </div>
  );
}

function StrategyFields(props) {
  return (
    <fieldset class="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <legend class="px-1 text-sm font-medium text-gray-900 dark:text-white">{props.title}</legend>
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {props.durationLabel}
        <input
          class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          type="number"
          min="1"
          value={props.duration}
          disabled={props.disabled}
          onInput={(event) => props.onDuration(event.target.value)}
        />
      </label>
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {props.poisLabel}
        <input
          class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          type="number"
          min="1"
          value={props.pois}
          disabled={props.disabled}
          onInput={(event) => props.onPois(event.target.value)}
        />
      </label>
    </fieldset>
  );
}

function CleanupExpired() {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [message, setMessage] = createSignal('');
  const cleanup = useMutation({
    mutationFn: () => apiClient.post(USERS_PATHS.adminCleanupExpired),
    onSuccess: (data) => setMessage(data?.message || t('admin.cleanupDone', 'Expired users removed.')),
    onError: (error) => setMessage(errorText(error, t('admin.cleanupFailed', 'Failed to cleanup expired users'))),
  });
  return (
    <div class={panelClass}>
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">{t('admin.quickAction', 'Quick Action')}</h2>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('admin.cleanupHint', 'Remove expired unverified accounts.')}</p>
      <button type="button" class={`${secondaryButtonClass} mt-4`} disabled={cleanup.isPending()} onClick={() => cleanup.mutate()}>
        {cleanup.isPending() ? t('admin.cleaning', 'Cleaning...') : t('admin.cleanup', 'Cleanup Expired Users')}
      </button>
      <Notice message={message()} />
    </div>
  );
}
