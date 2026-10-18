import { createEffect, createSignal, For, onCleanup, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery } from 'grainlet/query';
import { Link, navigate, useSearchParams } from 'grainlet/route';
import { apiClient, POI_PATHS, TRIP_PATHS } from '../../api.js';
import { translateApp } from '../../i18n.js';
import {
  ROUTE_AUTH_SIGNIN_TRIP_PENDING,
  ROUTE_AUTH_SIGNUP,
  ROUTE_HOME,
  routePlanById,
} from '../../routes.js';
import {
  CITY_SEARCH_MIN_QUERY_LENGTH,
  MAX_DURATION_DAYS,
  MAX_POIS_PER_DAY,
  MIN_POIS_PER_DAY,
  MONTH_KEYS,
  PACE_OPTIONS,
  TRENDING_CITIES_LIMIT,
  beginPendingTripGenerationResume,
  buildGeneratePayload,
  completePendingTripGenerationResume,
  failPendingTripGenerationResume,
  formatLocalDate,
  isMonthSelectable,
  monthDateBounds,
  parseCityList,
  resolvePace,
  savePendingTripGeneration,
  tripDurationDays,
} from './planModel.js';

const SIGN_IN_HREF = `${ROUTE_AUTH_SIGNIN_TRIP_PENDING}&callbackUrl=${encodeURIComponent('/plan/new')}`;

const STEP_TITLE_KEYS = [
  'planGenerate.v2StepWhere',
  'planGenerate.v2StepWhen',
  'planGenerate.v2StepDates',
  'planGenerate.v2StepPace',
];

export function PlanWizard() {
  const session = useSession();
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [search] = useSearchParams();
  const [step, setStep] = createSignal(1);
  const [selectedCityName, setSelectedCityName] = createSignal(search().get('city') || '');
  const [selectedCityId, setSelectedCityId] = createSignal(search().get('cityId') || '');
  const [cityQuery, setCityQuery] = createSignal('');
  const [debouncedCity, setDebouncedCity] = createSignal('');
  const [year, setYear] = createSignal(new Date().getFullYear());
  const [monthIndex, setMonthIndex] = createSignal(null);
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [pacePreset, setPacePreset] = createSignal(null);
  const [customPois, setCustomPois] = createSignal('5');
  const [customStrategy, setCustomStrategy] = createSignal('nearby');
  const [guestPrompt, setGuestPrompt] = createSignal(false);
  const [notice, setNotice] = createSignal('');
  const [resumeStarted, setResumeStarted] = createSignal(false);
  const today = new Date();

  createEffect(() => {
    const value = cityQuery();
    const handle = setTimeout(() => setDebouncedCity(value.trim()), 300);
    onCleanup(() => clearTimeout(handle));
  });

  const trending = useQuery(() => ({
    queryKey: [POI_PATHS.citiesTrending, TRENDING_CITIES_LIMIT],
    queryFn: async ({ signal }) => {
      const data = await apiClient.get(POI_PATHS.citiesTrending, {
        params: { limit: String(TRENDING_CITIES_LIMIT) },
        signal,
      });
      return parseCityList(data);
    },
    staleTime: 5 * 60 * 1000,
  }));

  const citySearch = useQuery(() => {
    const q = debouncedCity();
    return {
      queryKey: [POI_PATHS.citiesSearch, q],
      enabled: q.length >= CITY_SEARCH_MIN_QUERY_LENGTH && !selectedCityName(),
      queryFn: async ({ signal }) => {
        const data = await apiClient.get(POI_PATHS.citiesSearch, {
          params: { q },
          signal,
        });
        return parseCityList(data);
      },
    };
  });

  const generate = useMutation({
    mutationFn: (payload) => apiClient.post(TRIP_PATHS.generateFromQuiz, payload),
    onSuccess: (data) => {
      completePendingTripGenerationResume();
      const createdId = data?.tripId;
      if (!createdId) {
        setNotice(t('planGenerate.failed'));
        return;
      }
      navigate(routePlanById(createdId), { replace: true });
    },
    onError: () => {
      failPendingTripGenerationResume();
      setNotice(t('planGenerate.failed'));
    },
  });

  createEffect(() => {
    if (session.status() !== 'authenticated') return;
    if (resumeStarted()) return;
    const pending = beginPendingTripGenerationResume();
    if (!pending) return;
    setResumeStarted(true);
    setNotice('');
    generate.mutate(pending);
  });

  function selectCity(city) {
    setSelectedCityName(city.name);
    setSelectedCityId(city.id ? String(city.id) : '');
    setCityQuery('');
    setDebouncedCity('');
  }

  function clearCity() {
    setSelectedCityName('');
    setSelectedCityId('');
  }

  function selectMonth(index) {
    setMonthIndex(index);
    setStartDate('');
    setEndDate('');
  }

  const bounds = () => {
    const index = monthIndex();
    if (index == null) return null;
    return monthDateBounds(year(), index, today);
  };

  const duration = () => tripDurationDays(startDate(), endDate());
  const pace = () => resolvePace(pacePreset(), customPois(), customStrategy());
  const tooLong = () => {
    const days = duration();
    return days != null && days > MAX_DURATION_DAYS;
  };
  const datesReady = () => {
    const days = duration();
    return days != null && days >= 1 && days <= MAX_DURATION_DAYS;
  };

  const canContinue = () => {
    if (generate.isPending()) return false;
    if (step() === 1) return Boolean(selectedCityName());
    if (step() === 2) return monthIndex() != null;
    if (step() === 3) return datesReady();
    if (step() === 4) return pace() != null && session.status() !== 'loading';
    return false;
  };

  function handleFinish() {
    const resolved = pace();
    const city = selectedCityName();
    const from = startDate();
    const to = endDate();
    if (!city || !from || !to || !resolved) return;
    const payload = buildGeneratePayload({
      city,
      cityId: selectedCityId(),
      startDate: from,
      endDate: to,
      poisPerDay: resolved.poisPerDay,
      selectionStrategy: resolved.selectionStrategy,
    });
    if (session.status() !== 'authenticated') {
      savePendingTripGeneration(payload);
      setGuestPrompt(true);
      return;
    }
    setNotice('');
    generate.mutate(payload);
  }

  function handleContinue() {
    if (!canContinue()) return;
    if (step() < 4) {
      setStep(step() + 1);
      return;
    }
    handleFinish();
  }

  function handleBack() {
    if (guestPrompt()) {
      setGuestPrompt(false);
      return;
    }
    if (step() === 1) {
      navigate(ROUTE_HOME);
      return;
    }
    setStep(step() - 1);
  }

  const primaryLabel = () => {
    if (generate.isPending()) return t('planGenerate.submitting');
    if (step() === 4) return t('planGenerate.v2BuildItinerary');
    return t('planGenerate.continue');
  };

  return (
    <Show
      when={!guestPrompt()}
      fallback={
        <div class="fixed inset-0 z-50 flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12">
          <div class="w-full max-w-sm space-y-6 text-center">
            <div class="coral-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl text-white">
              ✓
            </div>
            <h1 class="text-2xl font-bold text-foreground">{t('planGenerate.guestSignInTitle')}</h1>
            <p class="text-sm text-muted-foreground">{t('planGenerate.guestSignInBody')}</p>
            <Link
              href={ROUTE_AUTH_SIGNUP}
              class="coral-gradient flex h-12 w-full items-center justify-center rounded-2xl text-base font-semibold text-white hover:opacity-90"
            >
              {t('planGenerate.guestSignInCta')}
            </Link>
            <Link
              href={SIGN_IN_HREF}
              class="flex h-12 w-full items-center justify-center rounded-2xl border border-border text-base font-semibold text-foreground"
            >
              {t('planGenerate.guestSignInSecondary')}
            </Link>
          </div>
        </div>
      }
    >
      <div class="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">
        <div class="shrink-0 border-b border-border px-5 pb-4 pt-12">
          <div class="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"
              aria-label={step() > 1 ? t('planGenerate.back') : t('common.dismissToast')}
            >
              {step() > 1 ? '‹' : '×'}
            </button>
            <div class="text-center">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('planGenerate.stepOf', { current: step(), total: 4 })}
              </p>
              <p class="mt-0.5 text-sm font-bold text-foreground">
                {t(STEP_TITLE_KEYS[step() - 1])}
              </p>
            </div>
            <div class="w-10" />
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              class="coral-gradient h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step() / 4) * 100}%` }}
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <Show when={step() === 1}>
            <div class="px-5 pt-6">
              <h1 class="text-3xl font-bold leading-tight text-foreground">
                {t('planGenerate.v2WhereTitleLine1')}
                <br />
                {t('planGenerate.v2WhereTitleLine2')}
              </h1>
              <p class="mb-6 mt-2 text-sm text-muted-foreground">{t('planGenerate.v2WhereSubtitle')}</p>
              <Show
                when={selectedCityName()}
                fallback={
                  <div class="relative mb-6">
                    <div class="flex items-center gap-3 rounded-2xl bg-muted px-4 py-4">
                      <input
                        type="text"
                        placeholder={t('planGenerate.v2SearchPlaceholder')}
                        value={cityQuery()}
                        onInput={(event) => setCityQuery(event.target.value)}
                        class="flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
                      />
                      <Show when={cityQuery()}>
                        <button
                          type="button"
                          onClick={() => setCityQuery('')}
                          aria-label={t('common.dismissToast')}
                          class="text-muted-foreground"
                        >
                          ×
                        </button>
                      </Show>
                    </div>
                    <Show when={debouncedCity().length >= CITY_SEARCH_MIN_QUERY_LENGTH}>
                      <ul class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg">
                        <Show when={citySearch.isError()}>
                          <li class="px-3 py-2 text-sm text-destructive">{t('explore.searchFailed')}</li>
                        </Show>
                        <Show when={citySearch.isFetching() && !citySearch.data()?.length}>
                          <li class="px-3 py-2 text-sm text-muted-foreground">…</li>
                        </Show>
                        <Show
                          when={!citySearch.isError() && !citySearch.isFetching() && (citySearch.data()?.length ?? 0) === 0}
                        >
                          <li class="px-3 py-2 text-sm text-muted-foreground">{t('explore.noCitiesFound')}</li>
                        </Show>
                        <For each={() => citySearch.data() ?? []}>
                          {(city) => (
                            <li>
                              <button
                                type="button"
                                class="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => selectCity(city)}
                              >
                                <span class="font-medium text-foreground">{city.name}</span>
                                <span class="ml-2 text-muted-foreground">{city.country}</span>
                              </button>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>
                  </div>
                }
              >
                <div class="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3">
                  <span class="font-semibold text-foreground">{selectedCityName()}</span>
                  <button type="button" onClick={clearCity} class="text-xs font-medium text-[#ff6b4a]">
                    {t('planGenerate.changeCity')}
                  </button>
                </div>
              </Show>
              <div class="mb-4 flex items-center gap-2">
                <span class="text-sm font-semibold uppercase tracking-wide text-foreground">
                  {t('planGenerate.v2Trending')}
                </span>
              </div>
              <Show when={trending.isError()}>
                <p class="mb-3 text-sm text-destructive">{t('explore.searchFailed')}</p>
              </Show>
              <div class="grid grid-cols-1 gap-3 pb-6">
                <For each={() => trending.data() ?? []}>
                  {(city) => (
                    <button
                      type="button"
                      aria-pressed={selectedCityName() === city.name}
                      onClick={() => selectCity(city)}
                      class={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 cursor-pointer ${
                        selectedCityName() === city.name
                          ? 'border-[#ff6b4a] bg-orange-50'
                          : 'border-border bg-white hover:border-muted-foreground/30'
                      }`}
                    >
                      <span class="text-2xl">📍</span>
                      <div class="min-w-0 flex-1">
                        <p class="text-base font-bold text-foreground">{city.name}</p>
                        <p class="mt-0.5 text-xs text-muted-foreground">{city.country}</p>
                      </div>
                      <Show when={selectedCityName() === city.name}>
                        <div class="coral-gradient flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white">
                          ✓
                        </div>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <Show when={step() === 2}>
            <div class="px-5 pt-6">
              <h1 class="text-3xl font-bold leading-tight text-foreground">
                {t('planGenerate.v2WhenTitleLine1')}
                <br />
                {t('planGenerate.v2WhenTitleLine2')}
              </h1>
              <p class="mb-6 mt-2 text-sm text-muted-foreground">{t('planGenerate.v2WhenSubtitle')}</p>
              <div class="mb-6 flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-bold text-foreground shadow-sm"
                  aria-label={t('planGenerate.back')}
                  onClick={() => {
                    setYear(year() - 1);
                    setMonthIndex(null);
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  ‹
                </button>
                <span class="text-lg font-bold text-foreground">{year()}</span>
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-bold text-foreground shadow-sm"
                  aria-label={t('planGenerate.continue')}
                  onClick={() => {
                    setYear(year() + 1);
                    setMonthIndex(null);
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  ›
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3 pb-8">
                <For each={MONTH_KEYS}>
                  {(month, index) => (
                    <button
                      type="button"
                      disabled={!isMonthSelectable(year(), index(), today)}
                      aria-pressed={monthIndex() === index()}
                      onClick={() => selectMonth(index())}
                      class={`rounded-2xl border-2 px-4 py-4 text-left text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        monthIndex() === index()
                          ? 'border-[#ff6b4a] bg-orange-50 text-[#ff6b4a]'
                          : 'border-border bg-white text-foreground hover:border-muted-foreground/30'
                      }`}
                    >
                      {month}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <Show when={step() === 3}>
            <div class="px-5 pt-6 pb-8">
              <h1 class="text-3xl font-bold leading-tight text-foreground">
                {t('planGenerate.v2DatesTitleLine1')}
                <br />
                {t('planGenerate.v2DatesTitleLine2')}
              </h1>
              <p class="mb-6 mt-2 text-sm text-muted-foreground">
                {t('planGenerate.v2DatesSubtitle', {
                  month: monthIndex() == null ? '' : `${MONTH_KEYS[monthIndex()]} ${year()}`,
                })}
              </p>
              <div class="flex flex-col gap-4">
                <label class="block text-sm font-medium text-foreground">
                  {t('planGenerate.datesLabel')}
                  <input
                    type="date"
                    class="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-3 text-foreground"
                    min={bounds() ? formatLocalDate(bounds().minSelectable) : undefined}
                    max={bounds() ? formatLocalDate(bounds().monthEnd) : undefined}
                    value={startDate()}
                    onInput={(event) => setStartDate(event.target.value)}
                  />
                </label>
                <label class="block text-sm font-medium text-foreground">
                  <input
                    type="date"
                    class="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-3 text-foreground"
                    min={startDate() || (bounds() ? formatLocalDate(bounds().minSelectable) : undefined)}
                    max={bounds() ? formatLocalDate(bounds().monthEnd) : undefined}
                    value={endDate()}
                    onInput={(event) => setEndDate(event.target.value)}
                  />
                </label>
              </div>
              <Show when={datesReady()}>
                <p class="mt-4 text-sm font-medium text-foreground">
                  {t('planGenerate.datesSummary', { count: String(duration()) })}
                </p>
              </Show>
              <Show when={!datesReady() && (startDate() || endDate()) && !tooLong()}>
                <p class="mt-4 text-sm text-destructive">{t('planGenerate.dateRangeRequired')}</p>
              </Show>
              <Show when={tooLong()}>
                <p class="mt-4 text-sm text-destructive">
                  {t('planGenerate.durationTooLong', { max: MAX_DURATION_DAYS })}
                </p>
              </Show>
              <p class="mt-3 text-sm text-muted-foreground">{t('planGenerate.datesHint')}</p>
            </div>
          </Show>

          <Show when={step() === 4}>
            <div class="px-5 pt-6 pb-8">
              <h1 class="text-3xl font-bold leading-tight text-foreground">
                {t('planGenerate.v2PaceTitleLine1')}
                <br />
                {t('planGenerate.v2PaceTitleLine2')}
              </h1>
              <p class="mb-6 mt-2 text-sm text-muted-foreground">{t('planGenerate.v2PaceSubtitle')}</p>
              <div class="flex flex-col gap-4">
                <For each={PACE_OPTIONS}>
                  {(option) => (
                    <div>
                      <button
                        type="button"
                        onClick={() => setPacePreset(option.id)}
                        class={`relative w-full rounded-3xl border-2 p-5 text-left transition-all duration-300 ${
                          pacePreset() === option.id
                            ? 'border-[#ff6b4a] bg-orange-50/80 shadow-lg shadow-orange-900/10'
                            : 'border-border bg-white hover:border-muted-foreground/30'
                        }`}
                      >
                        <div class="mb-2 flex items-start justify-between gap-3">
                          <div class="flex items-center gap-3">
                            <span class="text-3xl">{option.emoji}</span>
                            <div>
                              <p
                                class={`text-lg font-bold ${
                                  pacePreset() === option.id ? 'text-[#ff6b4a]' : 'text-foreground'
                                }`}
                              >
                                {t(option.titleKey)}
                              </p>
                              <Show when={option.activitiesKey}>
                                <span class="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                  {t(option.activitiesKey)}
                                </span>
                              </Show>
                            </div>
                          </div>
                          <Show when={pacePreset() === option.id}>
                            <div class="coral-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm text-white">
                              ✓
                            </div>
                          </Show>
                        </div>
                        <p class="text-sm leading-relaxed text-muted-foreground">{t(option.descKey)}</p>
                      </button>
                      <Show when={option.id === 'custom' && pacePreset() === 'custom'}>
                        <div class="mt-3 space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
                          <label class="mb-1 block text-sm font-medium text-foreground">
                            {t('planGenerate.v2PaceCustomPoisLabel')}
                            <input
                              type="number"
                              min={MIN_POIS_PER_DAY}
                              max={MAX_POIS_PER_DAY}
                              value={customPois()}
                              onInput={(event) => setCustomPois(event.target.value)}
                              class="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
                            />
                          </label>
                          <Show when={pace() == null}>
                            <p class="text-xs text-destructive">
                              {t('planGenerate.poisPerDayValidation', {
                                min: MIN_POIS_PER_DAY,
                                max: MAX_POIS_PER_DAY,
                              })}
                            </p>
                          </Show>
                          <p class="mb-2 text-sm font-medium text-foreground">
                            {t('planGenerate.v2PaceCustomStrategyLabel')}
                          </p>
                          <div role="radiogroup" aria-label={t('planGenerate.v2PaceCustomStrategyLabel')} class="flex flex-col gap-3">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={customStrategy() === 'nearby'}
                              onClick={() => setCustomStrategy('nearby')}
                              class={`rounded-2xl border-2 p-4 text-left ${
                                customStrategy() === 'nearby'
                                  ? 'border-[#ff6b4a] bg-orange-50'
                                  : 'border-border bg-white'
                              }`}
                            >
                              <p class="text-sm font-semibold text-foreground">{t('planGenerate.strategyNearbyTitle')}</p>
                              <p class="mt-1 text-xs text-muted-foreground">{t('planGenerate.strategyNearbyBody')}</p>
                            </button>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={customStrategy() === 'popularity'}
                              onClick={() => setCustomStrategy('popularity')}
                              class={`rounded-2xl border-2 p-4 text-left ${
                                customStrategy() === 'popularity'
                                  ? 'border-[#ff6b4a] bg-orange-50'
                                  : 'border-border bg-white'
                              }`}
                            >
                              <p class="text-sm font-semibold text-foreground">{t('planGenerate.strategyPopularityTitle')}</p>
                              <p class="mt-1 text-xs text-muted-foreground">{t('planGenerate.strategyPopularityBody')}</p>
                            </button>
                          </div>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>

        <div class="shrink-0 border-t border-border bg-white px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Show when={notice()}>
            <p class="mb-3 text-sm text-destructive" role="alert">{notice()}</p>
          </Show>
          <button
            type="button"
            disabled={!canContinue()}
            onClick={handleContinue}
            class={`h-auto w-full rounded-2xl py-6 text-base font-bold ${
              canContinue()
                ? 'coral-gradient border-0 text-white shadow-lg shadow-orange-900/20 hover:opacity-90'
                : 'cursor-not-allowed bg-muted text-muted-foreground'
            }`}
          >
            {primaryLabel()}
          </button>
        </div>
      </div>
    </Show>
  );
}
