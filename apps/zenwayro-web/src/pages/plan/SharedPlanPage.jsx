import { createEffect, createMemo, createSignal, For, Show, Switch, Match } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { Link, navigate, useParams } from 'grainlet/route';
import { apiClient, TRIP_PATHS } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_QUIZ } from '../../routes.js';
import { PlanMap } from './PlanMap.jsx';
import {
  formatPlanDayHeading,
  formatPlanDuration,
  getPlaceSummary,
  parseSharedPlanSlug,
  sharedRedirectPath,
  toTripPlan,
} from './planModel.js';

export function SharedPlanPage() {
  const params = useParams();
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const parsed = () => parseSharedPlanSlug(params()['*'] ?? '');
  const [activeDay, setActiveDay] = createSignal(null);
  const [openDays, setOpenDays] = createSignal(null);
  const [selectedId, setSelectedId] = createSignal(null);

  const sharedQuery = useQuery(() => {
    const slug = parsed();
    return {
      queryKey: [TRIP_PATHS.sharedBySlug(slug?.key ?? '')],
      enabled: Boolean(slug?.key),
      queryFn: ({ signal }) => apiClient.get(TRIP_PATHS.sharedBySlug(slug.key), { signal }),
    };
  });

  const plan = createMemo(() => {
    const raw = sharedQuery.data();
    return raw ? toTripPlan(raw) : null;
  });

  createEffect(() => {
    const slug = parsed();
    const current = plan();
    const path = sharedRedirectPath(current?.canonicalPath);
    if (slug?.kind !== 'legacy' || !path.startsWith('/')) return;
    navigate(path, { replace: true });
  });

  const legacyMiss = () => {
    const slug = parsed();
    if (slug?.kind !== 'legacy') return false;
    if (sharedQuery.isLoading() || sharedQuery.isFetching()) return false;
    return !sharedRedirectPath(plan()?.canonicalPath).startsWith('/');
  };

  const currentDay = () => {
    const days = plan()?.days ?? [];
    if (!days.length) return null;
    const active = activeDay();
    return days.find((day) => day.day === active) ?? days[0];
  };

  function dayHeading(day, startDate) {
    return formatPlanDayHeading(day.day, startDate) || t('dayTab.day', { number: String(day.day) });
  }

  function isOpen(dayNumber) {
    const open = openDays();
    if (open == null) return true;
    return open.includes(dayNumber);
  }

  function toggleDay(dayNumber, days) {
    setActiveDay(dayNumber);
    const numbers = days.map((day) => day.day);
    const current = openDays() == null ? numbers : openDays();
    setOpenDays(
      current.includes(dayNumber)
        ? current.filter((value) => value !== dayNumber)
        : [...current, dayNumber]
    );
  }

  return (
    <div class="zenwayro-v2-ui h-full min-h-0 bg-background" data-plan-ui="v2">
      <Switch>
        <Match when={!parsed() || legacyMiss()}>
          <div class="min-h-screen flex flex-col">
            <div class="flex-1 flex items-center justify-center">
              <p class="text-red-500">{t('sharedPlan.tripNotFound')}</p>
            </div>
          </div>
        </Match>
        <Match when={sharedQuery.isLoading() || (parsed()?.kind === 'legacy' && sharedRedirectPath(plan()?.canonicalPath).startsWith('/'))}>
          <div class="min-h-screen flex items-center justify-center" role="status">
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
          </div>
        </Match>
        <Match when={sharedQuery.isError() || !plan()}>
          <div class="min-h-screen flex flex-col">
            <div class="flex-1 flex items-center justify-center">
              <p class="text-red-500">{sharedQuery.error()?.message ?? t('sharedPlan.tripNotFound')}</p>
            </div>
          </div>
        </Match>
        <Match when={plan()}>
          <div class="flex h-full min-h-[70vh] flex-col overflow-hidden">
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-indigo-200 bg-indigo-50 px-4 py-2 dark:border-indigo-800 dark:bg-indigo-950">
              <span class="text-sm text-indigo-700 dark:text-indigo-300">
                {t('sharedPlan.banner', {
                  city: plan().city,
                  count: String(plan().durationDays),
                  plural: plan().durationDays !== 1 ? 's' : '',
                })}
              </span>
              <Link
                href={ROUTE_QUIZ}
                class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                {t('sharedPlan.createYourOwn')}
              </Link>
            </div>
            <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
              <div class="w-full shrink-0 overflow-y-auto bg-white dark:bg-gray-950 lg:w-[28rem] lg:border-r lg:border-gray-200 xl:w-[36rem] dark:lg:border-gray-800">
                <div class="px-4 pt-4 pb-2">
                  <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {t('plan.itineraryHeading')}
                  </h2>
                </div>
                <For
                  each={() => plan().days}
                  keyed={(day) => day.day}
                  fallback={
                    <p class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">{t('itinerary.noPlaces')}</p>
                  }
                >
                  {(day) => (
                    <div class="border-b border-gray-200 dark:border-gray-800">
                      <button
                        type="button"
                        aria-expanded={isOpen(day.day)}
                        onClick={() => toggleDay(day.day, plan().days)}
                        class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <span class={`mt-1 text-gray-400 ${isOpen(day.day) ? 'rotate-90' : ''}`}>›</span>
                        <div class="min-w-0 flex-1">
                          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {dayHeading(day, plan().startDate)}
                          </h3>
                          <Show when={!isOpen(day.day) && getPlaceSummary(day.places)}>
                            <p class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                              {getPlaceSummary(day.places)}
                            </p>
                          </Show>
                        </div>
                      </button>
                      <Show when={isOpen(day.day)}>
                        <div class="px-4 pb-3">
                          <Show when={day.durationMin != null || day.distanceKm != null}>
                            <div class="mb-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <Show when={day.durationMin != null}>
                                <span>{formatPlanDuration(day.durationMin)}</span>
                              </Show>
                              <Show when={day.distanceKm != null}>
                                <span>{day.distanceKm.toFixed(1)} {t('quiz.kmSuffix')}</span>
                              </Show>
                              <span>{t('plan.stopsCount', { count: String(day.places.length) })}</span>
                            </div>
                          </Show>
                          <Show when={day.places.length === 0}>
                            <p class="text-sm text-gray-500 dark:text-gray-400">{t('itinerary.noPlaces')}</p>
                          </Show>
                          <div class="space-y-2">
                            <For each={() => day.places}>
                              {(place, index) => (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedId(place.id);
                                    setActiveDay(day.day);
                                  }}
                                  class={`flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-3 text-left dark:bg-gray-900 ${
                                    place.id === selectedId()
                                      ? 'border-indigo-400 ring-1 ring-indigo-400'
                                      : 'border-gray-200 dark:border-gray-800'
                                  }`}
                                >
                                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                                    {index() + 1}
                                  </span>
                                  <span class="min-w-0">
                                    <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                                      {place.name}
                                    </span>
                                    <span class="block truncate text-xs text-gray-500">{place.category}</span>
                                  </span>
                                </button>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
              <div class="relative min-h-[360px] flex-1">
                <PlanMap
                  places={() => currentDay()?.places ?? []}
                  route={() => currentDay()?.routeGeometry ?? []}
                  selectedId={() => selectedId()}
                  onSelect={(place) => setSelectedId(place.id)}
                />
                <div class="absolute top-3 left-0 right-0 z-10 px-3">
                  <div class="flex gap-2 overflow-x-auto rounded-xl bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm dark:bg-gray-950/80">
                    <For each={() => plan()?.days ?? []}>
                      {(day) => (
                        <button
                          type="button"
                          class={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                            currentDay()?.day === day.day
                              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                              : 'text-gray-700 dark:text-gray-200'
                          }`}
                          onClick={() => setActiveDay(day.day)}
                        >
                          {t('dayTab.day', { number: String(day.day) })}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  );
}
