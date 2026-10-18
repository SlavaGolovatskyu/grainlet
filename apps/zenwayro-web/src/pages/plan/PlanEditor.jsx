import { createEffect, createSignal, For, onCleanup, onMount, Show, Switch, Match } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { createStore, produce, reconcile } from 'grainlet/store';
import { apiClient, POI_PATHS, TRIP_PATHS } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { PlanMap } from './PlanMap.jsx';
import {
  MAX_POIS_PER_DAY,
  PLACE_SEARCH_MIN_QUERY_LENGTH,
  POI_CATEGORIES,
  POI_CATEGORY_LABELS,
  READ_ONLY_EDIT_MESSAGE,
  canEditTrip,
  emptyPlanDocument,
  formatPlanDayHeading,
  formatPlanDuration,
  getPlaceSummary,
  moveItem,
  parsePoiList,
  toTripPlan,
} from './planModel.js';

const CATEGORY_SELECTED =
  'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-200';
const CATEGORY_IDLE =
  'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200';

const ADD_BUTTON_CLASS =
  'mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function placeSearchBody(q, city, cityId, excludeIds, categories) {
  const body = { excludeIds, categories };
  if (q) body.q = q;
  if (cityId) body.cityId = cityId;
  else body.city = city;
  return body;
}

function AddPlacePanel(props) {
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [query, setQuery] = createSignal('');
  const [debounced, setDebounced] = createSignal('');
  const [categories, setCategories] = createSignal(POI_CATEGORIES.slice());
  const [suggestionsReady, setSuggestionsReady] = createSignal(false);

  createEffect(() => {
    const value = query();
    const handle = setTimeout(() => setDebounced(value.trim()), 300);
    onCleanup(() => clearTimeout(handle));
  });

  onMount(() => {
    const handle = setTimeout(() => setSuggestionsReady(true), 1000);
    onCleanup(() => clearTimeout(handle));
  });

  const search = useQuery(() => {
    const q = debounced();
    const excludeIds = props.excludeIds();
    const selected = categories();
    return {
      queryKey: ['plan-poi-search', props.cityId(), q, excludeIds.join(','), selected.join(',')],
      enabled: q.length >= PLACE_SEARCH_MIN_QUERY_LENGTH,
      queryFn: async ({ signal }) => {
        const data = await apiClient.post(
          POI_PATHS.search,
          placeSearchBody(q, props.city(), props.cityId(), excludeIds, selected),
          { signal }
        );
        return parsePoiList(data);
      },
    };
  });

  const suggestions = useQuery(() => {
    const excludeIds = props.excludeIds();
    const selected = categories();
    return {
      queryKey: ['plan-poi-suggestions', props.cityId(), excludeIds.join(','), selected.join(',')],
      enabled: suggestionsReady() && debounced().length < PLACE_SEARCH_MIN_QUERY_LENGTH,
      queryFn: async ({ signal }) => {
        const data = await apiClient.post(
          POI_PATHS.suggestions,
          placeSearchBody('', props.city(), props.cityId(), excludeIds, selected),
          { signal }
        );
        return parsePoiList(data);
      },
    };
  });

  const searching = () => debounced().length >= PLACE_SEARCH_MIN_QUERY_LENGTH;
  const results = () => (searching() ? search.data() ?? [] : suggestions.data() ?? []);
  const loading = () => (searching() ? search.isFetching() : suggestions.isFetching());

  function toggleCategory(category) {
    setCategories((current) => {
      const selected = current.includes(category);
      if (selected && current.length === 1) return current;
      if (selected) return current.filter((item) => item !== category);
      return [...current, category];
    });
  }

  return (
    <div class="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
      <div class="p-3">
        <input
          type="text"
          placeholder={t('itinerary.searchPlaceholder')}
          value={query()}
          onInput={(event) => setQuery(event.target.value)}
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
        />
        <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter places by category">
          <For each={POI_CATEGORIES}>
            {(category) => (
              <button
                type="button"
                aria-pressed={categories().includes(category)}
                disabled={categories().length === 1 && categories().includes(category)}
                class={categories().includes(category) ? CATEGORY_SELECTED : CATEGORY_IDLE}
                onClick={() => toggleCategory(category)}
              >
                {POI_CATEGORY_LABELS[category]}
              </button>
            )}
          </For>
        </div>
      </div>
      <Show when={!searching() && results().length > 0}>
        <p class="px-3 pb-1 text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider">
          {t('itinerary.suggestionsHeading')}
        </p>
      </Show>
      <Show when={loading()}>
        <p class="px-3 py-2 text-sm text-gray-500">{t('itinerary.addingPlace')}</p>
      </Show>
      <Show when={searching() && !loading() && results().length === 0}>
        <p class="px-3 py-2 text-sm text-gray-500">{t('itinerary.noSearchResults')}</p>
      </Show>
      <ul>
        <For each={() => results()}>
          {(place) => (
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-gray-950"
                onClick={() => props.onAdd(place)}
              >
                <span class="font-medium text-gray-900 dark:text-white">{place.name}</span>
                <span class="text-xs text-gray-500">{place.category}</span>
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

function mutationPair(mutationFn, onDone, onFail) {
  return {
    mutationFn,
    onSuccess: () => {
      onDone();
    },
    onError: () => {
      onFail();
    },
  };
}

export function PlanEditor(props) {
  const session = useSession();
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const queryClient = useQueryClient();
  const tripId = () => (typeof props.tripId === 'function' ? props.tripId() : props.tripId);

  const tripQuery = useQuery(() => ({
    queryKey: [TRIP_PATHS.byId(tripId()), session.status()],
    enabled: Boolean(tripId()) && session.status() !== 'loading',
    queryFn: ({ signal }) => apiClient.get(TRIP_PATHS.byId(tripId()), { signal }),
  }));

  const [plan, setPlan] = createStore(emptyPlanDocument());
  const [activeDay, setActiveDay] = createSignal(null);
  const [openDays, setOpenDays] = createSignal(null);
  const [selectedId, setSelectedId] = createSignal(null);
  const [notice, setNotice] = createSignal('');
  const [addFor, setAddFor] = createSignal(null);
  const [addDayOpen, setAddDayOpen] = createSignal(false);
  const [removeTarget, setRemoveTarget] = createSignal(null);

  createEffect(() => {
    const fetching = tripQuery.isFetching();
    const raw = tripQuery.data();
    if (fetching || !raw) return;
    const next = toTripPlan(raw);
    if (!next?.id) return;
    setPlan(reconcile({ ...next, ready: true }));
  });

  function refresh() {
    setNotice('');
    return queryClient.invalidateQueries({ queryKey: [TRIP_PATHS.byId(tripId())] });
  }

  function fail(key) {
    setNotice(t(key));
    return queryClient.invalidateQueries({ queryKey: [TRIP_PATHS.byId(tripId())] });
  }

  const editable = () => canEditTrip(plan, session.status());

  function deny() {
    if (editable()) return false;
    setNotice(READ_ONLY_EDIT_MESSAGE);
    return true;
  }

  const addPlaceMutation = useMutation(mutationPair(
    (body) => apiClient.post(TRIP_PATHS.dayAddPlace(tripId()), body),
    refresh,
    () => fail('plan.addPlaceFailed')
  ));
  const removePlaceMutation = useMutation(mutationPair(
    ({ dayNumber, poiId }) => apiClient.delete(TRIP_PATHS.dayRemovePlace(tripId(), dayNumber, poiId)),
    refresh,
    () => fail('plan.removePlaceFailed')
  ));
  const movePlaceMutation = useMutation(mutationPair(
    (body) => apiClient.patch(TRIP_PATHS.dayMovePlace(tripId()), body),
    refresh,
    () => fail('plan.movePlaceFailed')
  ));
  const reorderMutation = useMutation(mutationPair(
    (body) => apiClient.patch(TRIP_PATHS.reorder(tripId()), body),
    refresh,
    () => fail('plan.movePlaceFailed')
  ));
  const addDayMutation = useMutation(mutationPair(
    (autopopulate) => apiClient.post(TRIP_PATHS.days(tripId()), { autopopulate }),
    refresh,
    () => fail('plan.addDayFailed')
  ));
  const removeDayMutation = useMutation(mutationPair(
    (dayNumber) => apiClient.delete(TRIP_PATHS.dayByNumber(tripId(), dayNumber)),
    refresh,
    () => fail('plan.removeDayFailed')
  ));
  const autofillMutation = useMutation(mutationPair(
    (dayNumber) => apiClient.post(TRIP_PATHS.dayAutofill(tripId(), dayNumber)),
    refresh,
    () => fail('plan.autofillDayFailed')
  ));
  const routeMutation = useMutation(mutationPair(
    (body) => apiClient.patch(TRIP_PATHS.dayRoute(tripId(), body.dayNumber), {
      costing: body.costing,
      optimizeOrder: body.optimizeOrder,
    }),
    refresh,
    () => fail('plan.updateRouteFailed')
  ));

  const currentDayNumber = () => {
    const days = plan.days;
    if (!days?.length) return null;
    const active = activeDay();
    if (days.some((day) => day.day === active)) return active;
    return days[0].day;
  };

  const currentDay = () => plan.days.find((day) => day.day === currentDayNumber()) ?? null;

  function dayHeading(day) {
    return formatPlanDayHeading(day.day, plan.startDate) || t('dayTab.day', { number: String(day.day) });
  }

  function isOpen(dayNumber) {
    const open = openDays();
    if (open == null) return true;
    return open.includes(dayNumber);
  }

  function toggleDay(dayNumber) {
    setActiveDay(dayNumber);
    const numbers = plan.days.map((day) => day.day);
    const current = openDays() == null ? numbers : openDays();
    setOpenDays(
      current.includes(dayNumber)
        ? current.filter((value) => value !== dayNumber)
        : [...current, dayNumber]
    );
  }

  function addPlace(dayNumber, poi) {
    if (deny()) return;
    const day = plan.days.find((item) => item.day === dayNumber);
    if (!day) return;
    if (day.places.some((place) => place.id === poi.id)) return;
    if (day.places.length >= MAX_POIS_PER_DAY) {
      setNotice(t('plan.dayPoiLimitReached'));
      return;
    }
    setPlan(produce((draft) => {
      const target = draft.days.find((item) => item.day === dayNumber);
      if (target) target.places = [...target.places, poi];
    }));
    setAddFor(null);
    addPlaceMutation.mutate({ dayNumber, poiId: poi.id });
  }

  function removePlace(dayNumber, poiId) {
    if (deny()) return;
    setPlan(produce((draft) => {
      const target = draft.days.find((item) => item.day === dayNumber);
      if (target) target.places = target.places.filter((place) => place.id !== poiId);
    }));
    removePlaceMutation.mutate({ dayNumber, poiId });
  }

  function reorderPlaces(dayNumber, index, direction) {
    if (deny()) return;
    const day = plan.days.find((item) => item.day === dayNumber);
    if (!day) return;
    const moved = moveItem(day.places, index, direction);
    if (!moved) return;
    setPlan(produce((draft) => {
      const target = draft.days.find((item) => item.day === dayNumber);
      if (target) target.places = moved;
    }));
    reorderMutation.mutate({ day: dayNumber, placeIds: moved.map((place) => place.id) });
  }

  function movePlace(fromDay, toDay, poi) {
    if (deny() || fromDay === toDay) return;
    const target = plan.days.find((item) => item.day === toDay);
    if (!target) return;
    if (target.places.length >= MAX_POIS_PER_DAY) {
      setNotice(t('plan.dayPoiLimitReached'));
      return;
    }
    setPlan(produce((draft) => {
      for (const day of draft.days) {
        if (day.day === fromDay) day.places = day.places.filter((place) => place.id !== poi.id);
        if (day.day === toDay) day.places = [...day.places, poi];
      }
    }));
    movePlaceMutation.mutate({ fromDayNumber: fromDay, toDayNumber: toDay, poiId: poi.id });
  }

  function confirmAddDay(autopopulate) {
    if (deny()) return;
    setAddDayOpen(false);
    addDayMutation.mutate(autopopulate);
  }

  function confirmRemoveDay() {
    const dayNumber = removeTarget();
    if (dayNumber == null || deny()) return;
    setRemoveTarget(null);
    setPlan(produce((draft) => {
      draft.durationDays = Math.max(0, (draft.durationDays || draft.days.length) - 1);
      draft.days = draft.days
        .filter((day) => day.day !== dayNumber)
        .map((day) => (day.day > dayNumber ? { ...day, day: day.day - 1 } : day));
    }));
    const active = activeDay();
    if (active === dayNumber) setActiveDay(Math.max(1, dayNumber - 1));
    else if (active != null && active > dayNumber) setActiveDay(active - 1);
    removeDayMutation.mutate(dayNumber);
  }

  function autofillDay(dayNumber) {
    if (deny()) return;
    autofillMutation.mutate(dayNumber);
  }

  function changeRoute(next) {
    if (deny()) return;
    const day = currentDay();
    if (!day || day.places.length < 2) return;
    const costing = day.routeCosting || 'pedestrian';
    const optimizeOrder = day.routeOptimizeOrder === true;
    if (next.costing === costing && next.optimizeOrder === optimizeOrder) return;
    routeMutation.mutate({
      dayNumber: day.day,
      costing: next.costing,
      optimizeOrder: next.optimizeOrder,
    });
  }

  const routePending = () =>
    routeMutation.isPending() && routeMutation.variables()?.dayNumber === currentDayNumber();

  const showSpinner = () =>
    session.status() === 'loading' ||
    tripQuery.isLoading() ||
    (tripQuery.data() && !plan.ready && !tripQuery.isError());

  const toolbarVisible = () => editable() && (currentDay()?.places.length ?? 0) >= 2;

  return (
    <Switch
      fallback={
        <div class="min-h-screen flex flex-col">
          <div class="flex-1 flex items-center justify-center">
            <p class="text-gray-500">{t('plan.noTripFound')}</p>
          </div>
        </div>
      }
    >
      <Match when={showSpinner()}>
        <div class="min-h-screen flex items-center justify-center" role="status">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      </Match>
      <Match when={tripQuery.isError()}>
        <div class="min-h-screen flex items-center justify-center">
          <p class="text-red-500">{tripQuery.error()?.message || t('plan.failedToLoad')}</p>
        </div>
      </Match>
      <Match when={plan.ready}>
        <div class="flex h-full min-h-[70vh] flex-col overflow-hidden">
          <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            <div class="w-full shrink-0 overflow-y-auto bg-white dark:bg-gray-950 lg:w-[28rem] lg:border-r lg:border-gray-200 xl:w-[36rem] dark:lg:border-gray-800">
              <div class="px-4 pt-4 pb-2">
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t('plan.itineraryHeading')}
                </h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{plan.city}</p>
              </div>
              <Show when={notice()}>
                <p class="mx-4 mb-2 text-sm text-red-500" role="alert">{notice()}</p>
              </Show>
              <For
                each={() => plan.days}
                keyed={(day) => day.day}
                fallback={
                  <p class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">{t('itinerary.noPlaces')}</p>
                }
              >
                {(day) => (
                  <div class="border-b border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => toggleDay(day.day)}
                      aria-expanded={isOpen(day.day)}
                      class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <span class={`mt-1 text-gray-400 ${isOpen(day.day) ? 'rotate-90' : ''}`}>›</span>
                      <div class="min-w-0 flex-1">
                        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {dayHeading(day)}
                        </h3>
                        <Show when={!isOpen(day.day) && getPlaceSummary(day.places)}>
                          <p class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                            {getPlaceSummary(day.places)}
                          </p>
                        </Show>
                      </div>
                    </button>
                    <Show when={isOpen(day.day)}>
                      <div class="px-4 pb-3" role="region" aria-label={dayHeading(day)}>
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
                        <Show when={editable() && day.places.length === 0}>
                          <button
                            type="button"
                            class="mb-3 text-sm font-medium text-indigo-600 disabled:opacity-50"
                            disabled={autofillMutation.isPending() && autofillMutation.variables() === day.day}
                            onClick={() => autofillDay(day.day)}
                          >
                            {autofillMutation.isPending() && autofillMutation.variables() === day.day
                              ? t('plan.autofillingDay')
                              : t('plan.autofillDay')}
                          </button>
                        </Show>
                        <Show when={day.places.length === 0}>
                          <p class="text-sm text-gray-500 dark:text-gray-400">{t('itinerary.noPlaces')}</p>
                        </Show>
                        <div class="space-y-2">
                          <For each={() => day.places}>
                            {(place, index) => (
                              <div
                                class={`flex items-center gap-1 ${
                                  place.id === selectedId()
                                    ? 'rounded-lg ring-1 ring-indigo-400'
                                    : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  class="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-left dark:border-gray-800 dark:bg-gray-900"
                                  onClick={() => {
                                    setSelectedId(place.id);
                                    setActiveDay(day.day);
                                  }}
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
                                <Show when={editable()}>
                                  <div class="flex shrink-0 flex-col">
                                    <button
                                      type="button"
                                      class="p-1 text-gray-600 disabled:opacity-30"
                                      aria-label={t('placeCard.moveUp')}
                                      disabled={index() === 0}
                                      onClick={() => reorderPlaces(day.day, index(), -1)}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      class="p-1 text-gray-600 disabled:opacity-30"
                                      aria-label={t('placeCard.moveDown')}
                                      disabled={index() === day.places.length - 1}
                                      onClick={() => reorderPlaces(day.day, index(), 1)}
                                    >
                                      ↓
                                    </button>
                                    <button
                                      type="button"
                                      class="p-1 text-red-500"
                                      aria-label={t('placeCard.remove')}
                                      onClick={() => removePlace(day.day, place.id)}
                                    >
                                      ×
                                    </button>
                                    <Show when={plan.days.length > 1}>
                                      <div class="flex max-w-[5.5rem] flex-col gap-1">
                                        <For each={() => plan.days.filter((item) => item.day !== day.day && item.places.length < MAX_POIS_PER_DAY)}>
                                          {(target) => (
                                            <button
                                              type="button"
                                              class="rounded border border-gray-300 px-1 py-0.5 text-[10px] leading-tight text-gray-700 dark:border-gray-600 dark:text-gray-200"
                                              aria-label={`${t('itinerary.moveTo')} ${dayHeading(target)}`}
                                              onClick={() => movePlace(day.day, target.day, place)}
                                            >
                                              {t('itinerary.moveTo')} {target.day}
                                            </button>
                                          )}
                                        </For>
                                      </div>
                                    </Show>
                                  </div>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>
                        <Show when={editable() && addFor() !== day.day}>
                          <button
                            type="button"
                            class={ADD_BUTTON_CLASS}
                            disabled={day.places.length >= MAX_POIS_PER_DAY}
                            onClick={() => setAddFor(day.day)}
                          >
                            {t('itinerary.addPlace')}
                          </button>
                        </Show>
                        <Show when={day.places.length >= MAX_POIS_PER_DAY}>
                          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('plan.dayPoiLimitReached')}</p>
                        </Show>
                        <Show when={editable() && addFor() === day.day}>
                          <AddPlacePanel
                            city={() => plan.city}
                            cityId={() => plan.cityId || ''}
                            excludeIds={() => plan.days.flatMap((item) => item.places.map((place) => place.id))}
                            onAdd={(poi) => addPlace(day.day, poi)}
                          />
                        </Show>
                        <Show when={editable()}>
                          <button
                            type="button"
                            class="mt-2 text-xs font-medium text-red-500"
                            onClick={() => setRemoveTarget(day.day)}
                          >
                            {t('plan.removeDayTitle')}
                          </button>
                        </Show>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
              <Show when={editable()}>
                <div class="px-4 py-4">
                  <button
                    type="button"
                    class={ADD_BUTTON_CLASS}
                    disabled={addDayMutation.isPending()}
                    onClick={() => setAddDayOpen(true)}
                  >
                    {addDayMutation.isPending() ? t('plan.addDayLoading') : t('plan.addDay')}
                  </button>
                </div>
              </Show>
            </div>

            <div class="relative min-h-[360px] flex-1">
              <PlanMap
                places={() => currentDay()?.places ?? []}
                route={() => currentDay()?.routeGeometry ?? []}
                selectedId={() => selectedId()}
                onSelect={(place) => setSelectedId(place.id)}
              />
              <Show when={toolbarVisible()}>
                <div class="absolute top-3 left-3 z-20">
                  <div
                    role="radiogroup"
                    aria-label={t('plan.routeModeToolbarLabel')}
                    aria-busy={routePending()}
                    class={`rounded-xl bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm shadow-sm px-2 py-2 flex flex-wrap items-stretch justify-center gap-1 border border-gray-200/80 dark:border-gray-700/80 ${
                      routePending() ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!currentDay()?.routeOptimizeOrder && (currentDay()?.routeCosting || 'pedestrian') === 'pedestrian'}
                      class={`rounded-lg px-2 py-1.5 text-xs font-medium ${
                        !currentDay()?.routeOptimizeOrder && (currentDay()?.routeCosting || 'pedestrian') === 'pedestrian'
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-100'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}
                      onClick={() => changeRoute({ costing: 'pedestrian', optimizeOrder: false })}
                    >
                      {t('plan.routeWalking')}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!currentDay()?.routeOptimizeOrder && currentDay()?.routeCosting === 'auto'}
                      class={`rounded-lg px-2 py-1.5 text-xs font-medium ${
                        !currentDay()?.routeOptimizeOrder && currentDay()?.routeCosting === 'auto'
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-100'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}
                      onClick={() => changeRoute({ costing: 'auto', optimizeOrder: false })}
                    >
                      {t('plan.routeDriving')}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={currentDay()?.routeOptimizeOrder === true}
                      class={`rounded-lg px-2 py-1.5 text-xs font-medium ${
                        currentDay()?.routeOptimizeOrder === true
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-100'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}
                      onClick={() => changeRoute({
                        costing: currentDay()?.routeCosting || 'pedestrian',
                        optimizeOrder: true,
                      })}
                    >
                      {routePending() ? t('plan.optimizingRoute') : t('plan.routeOptimized')}
                    </button>
                  </div>
                </div>
              </Show>
              <div class={`absolute left-0 right-0 z-10 px-3 ${toolbarVisible() ? 'top-16' : 'top-3'}`}>
                <div class="flex gap-2 overflow-x-auto rounded-xl bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm dark:bg-gray-950/80">
                  <For each={() => plan.days}>
                    {(day) => (
                      <button
                        type="button"
                        class={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          currentDayNumber() === day.day
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

        <Show when={addDayOpen()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setAddDayOpen(false)}>
            <div
              class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{t('plan.addDayTitle')}</h3>
              <div class="mt-4 flex flex-col gap-2">
                <button type="button" class="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white" onClick={() => confirmAddDay(true)}>
                  {t('plan.addDaySuggest')}
                </button>
                <button type="button" class="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold dark:border-gray-700" onClick={() => confirmAddDay(false)}>
                  {t('plan.addDayManual')}
                </button>
                <button type="button" class="px-4 py-2 text-sm text-gray-500" onClick={() => setAddDayOpen(false)}>
                  {t('plan.removeDayCancel')}
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={removeTarget() != null}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setRemoveTarget(null)}>
            <div
              class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{t('plan.removeDayTitle')}</h3>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('plan.removeDayBody')}</p>
              <div class="mt-4 flex justify-end gap-2">
                <button type="button" class="rounded-lg px-4 py-2 text-sm" onClick={() => setRemoveTarget(null)}>
                  {t('plan.removeDayCancel')}
                </button>
                <button type="button" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={confirmRemoveDay}>
                  {t('plan.removeDayConfirm')}
                </button>
              </div>
            </div>
          </div>
        </Show>
      </Match>
    </Switch>
  );
}
