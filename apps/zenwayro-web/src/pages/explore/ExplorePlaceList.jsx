import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'grainlet';
import { useInfiniteQuery, useQuery } from 'grainlet/query';
import { apiClient } from '../../api.js';
import {
  POI_CATEGORIES,
  POI_CATEGORY_LABELS,
  nextReviewsOffset,
  normalizeReviewsPage,
  poiDetailPath,
  poiReviewsRequest,
} from './normalize.js';

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

function CategoryButton(props) {
  const selected = () => props.selectedCategories().includes(props.category);
  const stateClass = () =>
    selected()
      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-200'
      : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200';
  return (
    <button
      type="button"
      aria-pressed={selected() ? 'true' : 'false'}
      disabled={props.isCategoryDisabled(props.category)}
      class={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${stateClass()}`}
      onClick={() => props.onToggle(props.category)}
    >
      {POI_CATEGORY_LABELS[props.category]}
    </button>
  );
}

function PlaceRow(props) {
  const place = () => props.place;
  const selected = () => place().id === props.selectedPlaceId();
  const engagement = () => props.engagement(place().id);
  const saved = () => {
    const ids = props.savedIds();
    if (ids) return ids.has(place().id);
    return Boolean(engagement()?.isSaved);
  };
  const rating = () => {
    const value = engagement()?.averageRating ?? place().averageRating;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  const subtitle = () => place().description || place().category;

  return (
    <div
      role="button"
      tabindex="0"
      data-poi-id={place().id}
      class={`flex cursor-pointer overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-sm dark:bg-gray-900 ${
        selected()
          ? 'border-indigo-400 ring-1 ring-indigo-400 dark:border-indigo-500'
          : 'border-gray-200 dark:border-gray-800'
      }`}
      onClick={() => props.onSelectPlace(place().id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          props.onSelectPlace(place().id);
        }
      }}
    >
      <div class="relative h-[5.5rem] w-[4.5rem] shrink-0 overflow-hidden bg-gray-200 dark:bg-gray-800">
        <div class="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-400">
          {place().name?.charAt(0) || '?'}
        </div>
        <Show when={place().photoUrl}>
          <img
            src={place().photoUrl}
            alt=""
            class="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </Show>
        <Show when={props.showEngagement()}>
          <div class="absolute inset-0 z-10 flex items-start justify-between p-1">
            <span class="inline-flex rounded-full border border-black/5 bg-white/85 px-1 py-0.5 dark:border-white/10 dark:bg-neutral-900/80">
              <span class="inline-flex">
                <For each={[1, 2, 3, 4, 5]}>
                  {(star) => (
                    <button
                      type="button"
                      class="cursor-pointer border-none bg-transparent p-0"
                      aria-label={props.t('placeCard.starLabel', { stars: String(star) })}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onRate(place().id, star);
                      }}
                    >
                      <svg
                        class={`h-3 w-3 ${
                          (engagement()?.myRating ?? 0) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-none text-neutral-400'
                        }`}
                        viewBox="0 0 20 20"
                        stroke="currentColor"
                        stroke-width="1"
                      >
                        <path d={STAR_PATH} />
                      </svg>
                    </button>
                  )}
                </For>
              </span>
            </span>
            <button
              type="button"
              class="cursor-pointer rounded-full border border-black/5 bg-white/85 p-0.5 dark:border-white/10 dark:bg-neutral-900/80"
              aria-pressed={saved() ? 'true' : 'false'}
              aria-label={saved() ? props.t('placeCard.unsave') : props.t('placeCard.save')}
              onClick={(event) => {
                event.stopPropagation();
                props.onToggleSaved(place().id);
              }}
            >
              <svg
                class={`h-3.5 w-3.5 ${saved() ? 'fill-rose-500 text-rose-500' : 'fill-none text-neutral-400'}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
          </div>
        </Show>
        <Show when={rating() != null}>
          <span class="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-white/85 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-300">
            <svg class="h-2.5 w-2.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
            {rating().toFixed(1)}
          </span>
        </Show>
      </div>
      <div class="flex min-w-0 flex-1 flex-col justify-center px-3 py-3">
        <h3 class="truncate text-sm font-semibold text-gray-900 dark:text-white">{place().name}</h3>
        <Show when={subtitle()}>
          <p class="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{subtitle()}</p>
        </Show>
      </div>
    </div>
  );
}

export function ExplorePlaceList(props) {
  let scroller;
  let sentinel;
  let observer;

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (!props.hasNextPage?.() || props.isFetchingNextPage?.()) return;
        props.fetchNextPage?.();
      },
      { rootMargin: '200px' }
    );
    if (sentinel) observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    const id = props.selectedPlaceId?.();
    const open = props.open?.();
    if (!id || !open || !scroller) return;
    const node = scroller.querySelector(`[data-poi-id="${CSS.escape(id)}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  });

  const citiesMode = () => props.mode() === 'cities';

  return (
    <section
      class="absolute inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-gray-800 dark:bg-gray-950"
      style={() => ({ height: props.open() ? 'min(42vh, 28rem)' : '4.5rem' })}
      data-explore-sheet
      aria-label={citiesMode() ? props.t('explore.guestCitySelection') : props.t('explore.sidebarTitle')}
    >
      <div class="flex shrink-0 items-center justify-between gap-2 px-5 pb-2 pt-3">
        <button type="button" class="min-w-0 flex-1 cursor-pointer text-left" onClick={() => props.onToggle()}>
          <span class="bottom-sheet-handle mb-2 block" />
          <Show
            when={citiesMode()}
            fallback={
              <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                {props.placeSubtitle()}
              </span>
            }
          >
            <span class="block text-lg font-bold text-foreground">{props.t('explore.guestCitySelection')}</span>
            <span class="mt-0.5 block text-xs text-muted-foreground">{props.citySubtitle()}</span>
          </Show>
        </button>
        <Show when={props.open()}>
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted"
            aria-label={props.t('common.dismissToast')}
            onClick={() => props.onDismiss()}
          >
            <svg class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Show>
      </div>

      <Show when={props.open()}>
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Show when={props.actionError()}>
            <p class="px-5 text-sm text-red-600 dark:text-red-400">{props.actionError()}</p>
          </Show>
          <Show
            when={citiesMode()}
            fallback={
              <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3">
                <div class="mt-1 flex flex-wrap gap-2" role="group" aria-label="Filter places by category">
                  <For each={POI_CATEGORIES}>
                    {(category) => (
                      <CategoryButton
                        category={category}
                        selectedCategories={props.selectedCategories}
                        isCategoryDisabled={props.isCategoryDisabled}
                        onToggle={props.onToggleCategory}
                      />
                    )}
                  </For>
                </div>
                <Show when={props.placesLoading()}>
                  <div class="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                    {props.t('explore.loadingAttractions')}
                  </div>
                </Show>
                <Show when={props.placesError()}>
                  <p class="mt-4 text-sm text-red-600 dark:text-red-400">{props.t('explore.attractionsLoadFailed')}</p>
                </Show>
                <Show when={props.placesEmpty()}>
                  <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">{props.t('explore.noAttractionsYet')}</p>
                </Show>
                <div
                  ref={(node) => {
                    scroller = node;
                  }}
                  class="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)]"
                >
                  <ul class="m-0 flex list-none flex-col gap-2 p-0">
                    <For each={props.places()}>
                      {(place) => (
                        <li>
                          <PlaceRow
                            place={place}
                            selectedPlaceId={props.selectedPlaceId}
                            engagement={props.engagement}
                            savedIds={props.savedIds}
                            showEngagement={props.showEngagement}
                            onSelectPlace={props.onSelectPlace}
                            onToggleSaved={props.onToggleSaved}
                            onRate={props.onRate}
                            t={props.t}
                          />
                        </li>
                      )}
                    </For>
                  </ul>
                  <div
                    ref={(node) => {
                      if (sentinel && observer) observer.unobserve(sentinel);
                      sentinel = node;
                      if (node && observer) observer.observe(node);
                    }}
                    class="h-1 w-full"
                    aria-hidden="true"
                  />
                  <Show when={props.isFetchingNextPage()}>
                    <div class="flex items-center justify-center py-3 text-sm text-gray-500 dark:text-gray-400">
                      <span class="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                      {props.t('explore.loadingMore')}
                    </div>
                  </Show>
                </div>
              </div>
            }
          >
            <Show when={props.showGuestHint()}>
              <p class="mb-3 shrink-0 px-5 text-xs text-muted-foreground">{props.t('explore.guestMapHint')}</p>
            </Show>
            <div class="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)]">
              <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,9.75rem),1fr))] gap-3 md:grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] md:gap-4">
                <For each={props.cities()}>
                  {(city) => (
                    <button
                      type="button"
                      class={`relative aspect-[3/4] w-full min-w-0 cursor-pointer overflow-hidden rounded-2xl shadow-md ${
                        props.selectedCityId() === city.id ? 'ring-2 ring-[#ff6b4a]' : ''
                      }`}
                      onClick={() => props.onSelectCity(city)}
                    >
                      <Show
                        when={city.imageCdnUrl}
                        fallback={
                          <div class="flex h-full w-full items-center justify-center bg-muted text-3xl font-bold text-foreground">
                            {city.name.charAt(0)}
                          </div>
                        }
                      >
                        <img src={city.imageCdnUrl} alt="" class="h-full w-full object-cover" />
                      </Show>
                      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div class="absolute bottom-0 left-0 right-0 p-3 text-left">
                        <p class="text-sm font-bold text-white">{city.name}</p>
                        <p class="text-xs text-white/70">{city.country}</p>
                      </div>
                      <Show when={props.selectedCityId() === city.id}>
                        <div class="coral-gradient absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full">
                          <span class="text-xs font-bold text-white">✓</span>
                        </div>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </section>
  );
}

function reviewPages(data) {
  const pages = data?.pages ?? [];
  return pages.flatMap((page) => (Array.isArray(page?.items) ? page.items : []));
}

export function ExplorePlaceDetail(props) {
  const [tab, setTab] = createSignal('details');

  const detailQuery = useQuery(() => {
    const poiId = props.place()?.id ?? '';
    return {
      queryKey: ['poi-detail', poiId],
      enabled: poiId.length > 0,
      queryFn: ({ signal, queryKey }) => apiClient.get(poiDetailPath(queryKey[1]), { signal }),
    };
  });

  const reviewsQuery = useInfiniteQuery(() => {
    const poiId = props.place()?.id ?? '';
    return {
      queryKey: ['poi-public-reviews', poiId, 'newest'],
      enabled: poiId.length > 0,
      initialPageParam: 0,
      queryFn: async ({ pageParam, signal, queryKey }) => {
        const request = poiReviewsRequest(queryKey[1], pageParam);
        const raw = await apiClient.get(request.path, { params: request.params, signal });
        return normalizeReviewsPage(raw);
      },
      getNextPageParam: (lastPage) => nextReviewsOffset(lastPage),
    };
  });

  createEffect(() => {
    props.place()?.id;
    setTab('details');
  });

  return (
    <Show when={props.place()}>
      {(place) => {
        const detail = () => detailQuery.data();
        const description = () =>
          detail()?.description?.trim() || place.description?.trim() || '';
        const photo = () => place.photoUrl || detail()?.photos?.[0]?.url;
        return (
          <div class="pointer-events-none absolute inset-0 z-50">
            <Show when={props.isSmall()}>
              <button
                type="button"
                class="pointer-events-auto fixed inset-0 cursor-default bg-black/40"
                aria-label={props.t('plan.placeDetailClose')}
                onClick={() => props.onClose()}
              />
            </Show>
            <div
              role="dialog"
              aria-modal={props.isSmall() ? 'true' : undefined}
              aria-label={place.name}
              class={`pointer-events-auto flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-900 ${
                props.isSmall()
                  ? 'fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-2xl'
                  : 'absolute bottom-24 left-4 z-50 h-[min(70vh,36rem)] w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800'
              }`}
            >
              <div class="relative shrink-0 border-b border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  class="absolute right-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white"
                  aria-label={props.t('plan.placeDetailClose')}
                  onClick={() => props.onClose()}
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <Show
                  when={photo()}
                  fallback={<div class="h-40 bg-gray-200 dark:bg-gray-800" />}
                >
                  <img src={photo()} alt={place.name} class="h-40 w-full object-cover" />
                </Show>
              </div>
              <div class="flex shrink-0 gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800" role="tablist" aria-label={props.t('plan.placeDetailTabsAria')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab() === 'details' ? 'true' : 'false'}
                  class={`cursor-pointer rounded-full px-3 py-1 text-sm ${tab() === 'details' ? 'bg-muted font-semibold' : ''}`}
                  onClick={() => setTab('details')}
                >
                  {props.t('plan.placeDetailTabDetails')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab() === 'reviews' ? 'true' : 'false'}
                  class={`cursor-pointer rounded-full px-3 py-1 text-sm ${tab() === 'reviews' ? 'bg-muted font-semibold' : ''}`}
                  onClick={() => setTab('reviews')}
                >
                  {props.t('plan.placeDetailTabReviews')}
                </button>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <Show when={tab() === 'details'}>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{detail()?.name || place.name}</h2>
                  <p class="mt-1 text-xs capitalize text-gray-500">{place.category}</p>
                  <Show when={detailQuery.isLoading()}>
                    <p class="mt-3 text-sm text-gray-500">{props.t('plan.placeDetailLoading')}</p>
                  </Show>
                  <Show when={description()}>
                    <p class="mt-3 text-sm text-gray-700 dark:text-gray-300">{description()}</p>
                  </Show>
                  <Show when={!description() && !detailQuery.isLoading()}>
                    <p class="mt-3 text-sm text-gray-500">{props.t('plan.placeDetailNoDescription')}</p>
                  </Show>
                  <Show when={detail()?.openingHours || place.openingHours}>
                    <p class="mt-2 text-xs text-gray-500">{detail()?.openingHours || place.openingHours}</p>
                  </Show>
                  <Show when={Array.isArray(detail()?.highlights) && detail().highlights.length > 0}>
                    <h3 class="mt-4 text-sm font-semibold">{props.t('plan.placeDetailHighlights')}</h3>
                    <ul class="mt-1 list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                      <For each={detail().highlights}>{(item) => <li>{item}</li>}</For>
                    </ul>
                  </Show>
                </Show>
                <Show when={tab() === 'reviews'}>
                  <Show when={reviewsQuery.isLoading()}>
                    <p class="text-sm text-gray-500">{props.t('plan.placeDetailLoading')}</p>
                  </Show>
                  <Show when={reviewsQuery.isError()}>
                    <p class="text-sm text-red-600">{props.t('explore.attractionsLoadFailed')}</p>
                  </Show>
                  <ul class="m-0 flex list-none flex-col gap-3 p-0">
                    <For each={reviewPages(reviewsQuery.data())}>
                      {(review) => (
                        <li class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
                          <p class="font-medium">{review.authorDisplayName}</p>
                          <Show when={review.stars != null}>
                            <p class="text-xs text-amber-500">{props.t('placeCard.yourRating', { stars: String(review.stars) })}</p>
                          </Show>
                          <Show when={review.comment}>
                            <p class="mt-1 text-gray-700 dark:text-gray-300">{review.comment}</p>
                          </Show>
                        </li>
                      )}
                    </For>
                  </ul>
                  <Show when={reviewsQuery.hasNextPage()}>
                    <button
                      type="button"
                      class="mt-3 cursor-pointer text-sm font-medium text-indigo-600"
                      onClick={() => reviewsQuery.fetchNextPage()}
                    >
                      {reviewsQuery.isFetchingNextPage()
                        ? props.t('explore.loadingMore')
                        : props.t('plan.placeDetailTabReviews')}
                    </button>
                  </Show>
                </Show>
              </div>
            </div>
          </div>
        );
      }}
    </Show>
  );
}
