import { batch, createEffect, createSignal, For, onCleanup, onMount, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { useSearchParams } from 'grainlet/route';
import { apiClient, PLACE_ENGAGEMENT_PATHS } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ExploreMap } from './ExploreMap.jsx';
import { ExplorePlaceDetail, ExplorePlaceList } from './ExplorePlaceList.jsx';
import {
  CITY_SEARCH_DEBOUNCE_MS,
  CITY_SEARCH_MIN_QUERY_LENGTH,
  COVERED_CITIES_DEBOUNCE_MS,
  COVERED_CITIES_GC_MS,
  COVERED_CITIES_STALE_MS,
  EXPLORE_PLACES_QUERY_KEY,
  POI_CATEGORIES,
  citySearchRequest,
  cityToMapPoi,
  coveredCitiesRequest,
  filterCoveredCitiesBySearch,
  flattenUniquePlaces,
  nextPlacesOffset,
  parseCoveredCitiesResponse,
  placesRequest,
  readExploreCityParams,
  resolveCityFromSearchResults,
  savedPlaceIdSet,
  savedPoiIdsRequest,
  exploreCitySearchParams,
  normalizePoisResponse,
} from './normalize.js';
import {
  CITY_MAP_ZOOM,
  EUROPE_MAP_CENTER,
  EUROPE_MAP_ZOOM,
  hasMapViewportChanged,
  viewportToPickerCamera,
} from './viewport.js';

export function ExplorePage() {
  const session = useSession();
  const i18n = useI18n();
  const client = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const t = (key, variables) => translateApp(i18n, key, variables);

  const [selectedCity, setSelectedCity] = createSignal(null);
  const [searchValue, setSearchValue] = createSignal('');
  const [searchFocused, setSearchFocused] = createSignal(false);
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [focusedPlaceId, setFocusedPlaceId] = createSignal(null);
  const [openedPlaceId, setOpenedPlaceId] = createSignal(null);
  const [highlightedCityId, setHighlightedCityId] = createSignal(null);
  const [selectedCategories, setSelectedCategories] = createSignal(POI_CATEGORIES.slice());
  const [sheetOpen, setSheetOpen] = createSignal(true);
  const [viewport, setViewport] = createSignal(null);
  const [debouncedViewportKey, setDebouncedViewportKey] = createSignal(null);
  const [pickerCamera, setPickerCamera] = createSignal({
    center: EUROPE_MAP_CENTER,
    zoom: EUROPE_MAP_ZOOM,
  });
  const [flyToPicker, setFlyToPicker] = createSignal(false);
  const [isSmall, setIsSmall] = createSignal(false);
  let resolvedCityId = null;
  let wasCityPicker = true;

  const showCityPicker = () => !selectedCity();
  const isAuthenticated = () => session.status() === 'authenticated';
  const cityParams = () => readExploreCityParams(search());

  onMount(() => {
    const media = window.matchMedia('(max-width: 1279px)');
    setIsSmall(media.matches);
    const onChange = () => setIsSmall(media.matches);
    media.addEventListener('change', onChange);
    onCleanup(() => media.removeEventListener('change', onChange));
  });

  createEffect(() => {
    const focused = searchFocused();
    const value = searchValue().trim();
    const timer = setTimeout(() => {
      setDebouncedSearch(focused && value.length >= CITY_SEARCH_MIN_QUERY_LENGTH ? value : '');
    }, CITY_SEARCH_DEBOUNCE_MS);
    onCleanup(() => clearTimeout(timer));
  });

  createEffect(() => {
    const picker = showCityPicker();
    const current = viewport();
    if (wasCityPicker && !picker && current) {
      setPickerCamera(viewportToPickerCamera(current));
    }
    if (!wasCityPicker && picker) setFlyToPicker(true);
    wasCityPicker = picker;
  });

  createEffect(() => {
    if (!flyToPicker()) return;
    const timer = setTimeout(() => setFlyToPicker(false), 1500);
    onCleanup(() => clearTimeout(timer));
  });

  createEffect(() => {
    const picker = showCityPicker();
    const current = viewport();
    if (!picker || !current) {
      setDebouncedViewportKey(null);
      return;
    }
    const request = coveredCitiesRequest(current.zoom, current.bbox);
    const timer = setTimeout(() => setDebouncedViewportKey(request.cacheKey), COVERED_CITIES_DEBOUNCE_MS);
    onCleanup(() => clearTimeout(timer));
  });

  const cityLookup = useQuery(() => {
    const { city, cityId } = cityParams();
    const request = citySearchRequest(city);
    return {
      queryKey: ['explore-city-resolve', city, cityId],
      enabled: city.length >= CITY_SEARCH_MIN_QUERY_LENGTH,
      queryFn: async ({ signal, queryKey }) => {
        const lookup = citySearchRequest(queryKey[1]);
        const raw = await apiClient.get(lookup.path, { params: lookup.params, signal });
        return Array.isArray(raw) ? raw : [];
      },
    };
  });

  createEffect(() => {
    const { city, cityId } = cityParams();
    if (city.length < CITY_SEARCH_MIN_QUERY_LENGTH) {
      if (resolvedCityId != null || selectedCity()) {
        resolvedCityId = null;
        batch(() => {
          setSelectedCity(null);
          setSearchValue('');
          setFocusedPlaceId(null);
          setOpenedPlaceId(null);
          setHighlightedCityId(null);
        });
      }
      return;
    }
    const data = cityLookup.data();
    if (data == null) return;
    const resolved = resolveCityFromSearchResults(data, city, cityId);
    if (!resolved) {
      if (selectedCity()) {
        resolvedCityId = null;
        batch(() => {
          setSelectedCity(null);
          setSearchValue('');
        });
      }
      return;
    }
    if (resolvedCityId === resolved.id) return;
    resolvedCityId = resolved.id;
    batch(() => {
      setSelectedCity(resolved);
      setSearchValue(resolved.name);
      setHighlightedCityId(resolved.id);
    });
  });

  const covered = useQuery(() => {
    const cacheKey = debouncedViewportKey();
    const parsed = cacheKey ? coveredCitiesRequest(
      Number(cacheKey.split('|')[0]),
      {
        south: Number(cacheKey.split('|')[1]),
        west: Number(cacheKey.split('|')[2]),
        north: Number(cacheKey.split('|')[3]),
        east: Number(cacheKey.split('|')[4]),
      }
    ) : null;
    return {
      queryKey: [parsed?.path ?? 'covered-cities', cacheKey ?? 'idle'],
      enabled: showCityPicker() && cacheKey != null,
      staleTime: COVERED_CITIES_STALE_MS,
      gcTime: COVERED_CITIES_GC_MS,
      placeholderData: keepPreviousData,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      queryFn: async ({ signal, queryKey }) => {
        const key = queryKey[1];
        const [zoom, south, west, north, east] = String(key).split('|').map(Number);
        const request = coveredCitiesRequest(zoom, { south, west, north, east });
        const raw = await apiClient.get(request.path, { params: request.params, signal });
        return parseCoveredCitiesResponse(raw);
      },
    };
  });

  const placesQuery = useInfiniteQuery(() => {
    const city = selectedCity();
    const categories = selectedCategories().join(',');
    return {
      queryKey: [EXPLORE_PLACES_QUERY_KEY, city?.id ?? null, city?.name ?? null, categories],
      enabled: Boolean(city?.id) && selectedCategories().length > 0,
      initialPageParam: 0,
      queryFn: async ({ pageParam, signal, queryKey }) => {
        const request = placesRequest(queryKey[1], queryKey[3], pageParam);
        const raw = await apiClient.get(request.path, { params: request.params, signal });
        return normalizePoisResponse(raw);
      },
      getNextPageParam: (lastPage, allPages) => nextPlacesOffset(lastPage, allPages),
    };
  });

  const citySearch = useQuery(() => {
    const query = debouncedSearch();
    const request = citySearchRequest(query);
    return {
      queryKey: ['explore-city-search', query],
      enabled: query.length >= CITY_SEARCH_MIN_QUERY_LENGTH,
      queryFn: async ({ signal, queryKey }) => {
        const lookup = citySearchRequest(queryKey[1]);
        const raw = await apiClient.get(lookup.path, { params: lookup.params, signal });
        return Array.isArray(raw) ? raw : [];
      },
    };
  });

  function placeList() {
    return flattenUniquePlaces(placesQuery.data()?.pages);
  }

  function poiIds() {
    return placeList().map((place) => place.id).sort();
  }

  const engagementQuery = useQuery(() => {
    const ids = poiIds();
    return {
      queryKey: ['poi-engagement', ...ids],
      enabled: isAuthenticated() && ids.length > 0 && !showCityPicker(),
      queryFn: ({ signal, queryKey }) =>
        apiClient.post(PLACE_ENGAGEMENT_PATHS.batch, { poiIds: queryKey.slice(1) }, { signal }),
    };
  });

  const savedQuery = useQuery(() => {
    const cityName = selectedCity()?.name ?? '';
    const request = savedPoiIdsRequest(cityName);
    return {
      queryKey: ['saved-poi-ids', cityName],
      enabled: isAuthenticated() && cityName.length > 0 && !showCityPicker(),
      queryFn: async ({ signal, queryKey }) => {
        const lookup = savedPoiIdsRequest(queryKey[1]);
        return apiClient.get(lookup.path, { params: lookup.params, signal });
      },
    };
  });

  const savePlace = useMutation(() => ({
    mutationFn: (poiId) => apiClient.post(PLACE_ENGAGEMENT_PATHS.savedToggle, { poiId }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['poi-engagement'] });
      client.invalidateQueries({ queryKey: ['saved-poi-ids'] });
    },
  }));

  const ratePlace = useMutation(() => ({
    mutationFn: (variables) => apiClient.post(PLACE_ENGAGEMENT_PATHS.ratings, variables),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['poi-engagement'] });
    },
  }));

  function coveredCities() {
    const data = covered.data();
    return Array.isArray(data) ? data : [];
  }

  function filteredCities() {
    return filterCoveredCitiesBySearch(coveredCities(), searchValue());
  }

  function mapPlaces() {
    if (showCityPicker()) return coveredCities().map(cityToMapPoi);
    return placeList();
  }

  function mapCenter() {
    const city = selectedCity();
    if (!showCityPicker() && city) return [Number(city.centerLng), Number(city.centerLat)];
    return pickerCamera().center;
  }

  function mapZoom() {
    return showCityPicker() ? pickerCamera().zoom : CITY_MAP_ZOOM;
  }

  function savedIds() {
    if (!isAuthenticated() || showCityPicker()) return undefined;
    if (savedQuery.isSuccess() && Array.isArray(savedQuery.data()?.poiIds)) {
      return savedPlaceIdSet(savedQuery.data(), null);
    }
    return savedPlaceIdSet(undefined, engagementQuery.data());
  }

  function engagement(poiId) {
    const rows = engagementQuery.data();
    if (!Array.isArray(rows)) return undefined;
    const row = rows.find((item) => item.poiId === poiId);
    if (!row) return undefined;
    const ids = savedIds();
    if (!ids || ids.has(poiId) === row.isSaved) return row;
    return { ...row, isSaved: ids.has(poiId) };
  }

  function selectCity(city) {
    resolvedCityId = city.id;
    const next = exploreCitySearchParams(city.name, city.id);
    const current = search();
    current.forEach((value, key) => {
      if (key !== 'city' && key !== 'cityId') next.append(key, value);
    });
    setSearch(next);
    batch(() => {
      setSelectedCity(city);
      setSearchValue(city.name);
      setHighlightedCityId(city.id);
      setFocusedPlaceId(null);
      setOpenedPlaceId(null);
      setSheetOpen(true);
      setSearchFocused(false);
    });
  }

  function backToCities() {
    resolvedCityId = null;
    setSearch((current) => {
      const next = new URLSearchParams(current);
      next.delete('city');
      next.delete('cityId');
      return next;
    }, { replace: true });
    batch(() => {
      setSelectedCity(null);
      setSearchValue('');
      setFocusedPlaceId(null);
      setOpenedPlaceId(null);
      setHighlightedCityId(null);
      setSheetOpen(true);
      setSearchFocused(false);
    });
  }

  function handleViewportChange(next) {
    if (!showCityPicker()) return;
    setFlyToPicker(false);
    setViewport((prev) => {
      if (!prev) return next;
      if (!hasMapViewportChanged(prev, next)) return prev;
      return next;
    });
  }

  function onMarkerClick(place) {
    if (!showCityPicker()) {
      setFocusedPlaceId(place.id);
      return;
    }
    const city = coveredCities().find((item) => item.id === place.id);
    if (city) selectCity(city);
  }

  function onMapClick() {
    if (showCityPicker()) {
      setHighlightedCityId(null);
      return;
    }
    batch(() => {
      setFocusedPlaceId(null);
      setOpenedPlaceId(null);
    });
  }

  function toggleCategory(category) {
    setSelectedCategories((current) => {
      const selected = current.includes(category);
      if (selected && current.length === 1) return current;
      if (selected) return current.filter((item) => item !== category);
      return [...current, category];
    });
  }

  function isCategoryDisabled(category) {
    const current = selectedCategories();
    return current.length === 1 && current.includes(category);
  }

  function openedPlace() {
    const id = openedPlaceId();
    if (!id) return null;
    return placeList().find((place) => place.id === id) ?? null;
  }

  function citySubtitle() {
    const base = t('explore.guestCitiesCount', { count: String(filteredCities().length) });
    if (covered.isFetching() && !covered.isLoading()) return `${base} …`;
    return base;
  }

  function placeSubtitle() {
    const city = selectedCity();
    return city ? t('explore.planningFor', { city: city.name }) : t('explore.selectCityToPlan');
  }

  function actionError() {
    if (savePlace.isError()) return t('placeCard.saveFailed');
    if (ratePlace.isError()) return t('placeCard.rateFailed');
    return '';
  }

  const showSearchResults = () =>
    searchFocused() && searchValue().trim().length >= CITY_SEARCH_MIN_QUERY_LENGTH;

  return (
    <div
      class="zenwayro-v2-ui relative -m-5 h-[calc(100dvh-4.75rem)] min-h-[28rem] overflow-hidden bg-background"
      data-explore-page
    >
      <ExploreMap
        places={mapPlaces}
        selectedId={() => (showCityPicker() ? highlightedCityId() : focusedPlaceId())}
        savedIds={savedIds}
        variant={() => (showCityPicker() ? 'city-pill' : 'default')}
        center={mapCenter}
        zoom={mapZoom}
        syncCamera={() => !showCityPicker() || flyToPicker()}
        fitBounds={() => !showCityPicker()}
        onPlaceClick={onMarkerClick}
        onMapClick={onMapClick}
        onViewportChange={handleViewportChange}
      />

      <Show when={showCityPicker() && covered.isLoading() && coveredCities().length === 0}>
        <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/40">
          <span class="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      </Show>
      <Show when={showCityPicker() && covered.isError()}>
        <div class="absolute inset-x-0 top-20 z-20 mx-auto max-w-lg px-6 text-center text-sm text-destructive">
          {t('explore.attractionsLoadFailed')}
        </div>
      </Show>

      <header class="pointer-events-none absolute left-0 right-0 top-0 z-30 px-4 pt-3">
        <div class="pointer-events-auto mx-auto flex max-w-lg items-center gap-2">
          <Show when={!showCityPicker()}>
            <button
              type="button"
              class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/90 shadow-md backdrop-blur-md"
              aria-label={t('explore.backToCities')}
              onClick={backToCities}
            >
              <svg class="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Show>
          <div class="relative min-w-0 flex-1">
            <div class="glass-dark flex min-h-0 items-center gap-3 rounded-2xl px-4 py-3 shadow-xl">
              <svg class="h-[18px] w-[18px] shrink-0 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7" />
                <path stroke-linecap="round" d="M20 20l-3-3" />
              </svg>
              <input
                type="text"
                value={searchValue()}
                placeholder={t('explore.searchPlaceholder')}
                class="min-h-0 min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/75"
                onInput={(event) => {
                  setSearchValue(event.currentTarget.value);
                  setSearchFocused(true);
                }}
                onFocus={() => {
                  setSearchFocused(true);
                  setSheetOpen(true);
                }}
              />
              <Show when={citySearch.isFetching() && showSearchResults()}>
                <span class="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </Show>
              <Show when={searchValue() && !(citySearch.isFetching() && showSearchResults())}>
                <button
                  type="button"
                  class="shrink-0 cursor-pointer text-white/75"
                  aria-label={t('common.dismissToast')}
                  onClick={() => {
                    if (selectedCity()) backToCities();
                    else {
                      setSearchValue('');
                      setSearchFocused(false);
                    }
                  }}
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Show>
            </div>
            <Show when={showSearchResults()}>
              <div
                class="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
                onMouseDown={(event) => event.preventDefault()}
              >
                <Show when={citySearch.isError()}>
                  <p class="px-3 py-2 text-sm text-destructive">
                    {citySearch.error()?.message || t('explore.searchFailed')}
                  </p>
                </Show>
                <Show when={!citySearch.isError() && !citySearch.isFetching() && debouncedSearch().length >= CITY_SEARCH_MIN_QUERY_LENGTH && (citySearch.data()?.length ?? 0) === 0}>
                  <p class="px-3 py-2 text-sm text-muted-foreground">{t('explore.noCitiesFound')}</p>
                </Show>
                <For each={citySearch.data() ?? []}>
                  {(city) => (
                    <button
                      type="button"
                      class="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => selectCity(city)}
                    >
                      <span class="font-medium">{city.name}</span>
                      <span class="ml-2 text-muted-foreground">{city.country}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </header>

      <Show when={showCityPicker() && !sheetOpen()}>
        <div class="pointer-events-none absolute z-30" style={{ right: '0.5rem', bottom: '3.5rem' }}>
          <button
            type="button"
            class="coral-gradient pointer-events-auto flex cursor-pointer items-center gap-2 rounded-2xl border-0 px-3 py-3 font-semibold text-white shadow-2xl"
            onClick={() => setSheetOpen(true)}
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" />
              <path stroke-linecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            </svg>
            <span>{t('nav.explore')}</span>
          </button>
        </div>
      </Show>

      <ExplorePlaceList
        t={t}
        mode={() => (showCityPicker() ? 'cities' : 'places')}
        open={sheetOpen}
        onToggle={() => setSheetOpen((open) => !open)}
        onDismiss={() => setSheetOpen(false)}
        cities={filteredCities}
        selectedCityId={highlightedCityId}
        onSelectCity={selectCity}
        citySubtitle={citySubtitle}
        placeSubtitle={placeSubtitle}
        showGuestHint={() => !isAuthenticated()}
        places={placeList}
        selectedPlaceId={focusedPlaceId}
        onSelectPlace={(placeId) => {
          batch(() => {
            setFocusedPlaceId(placeId);
            setOpenedPlaceId(placeId);
          });
        }}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        isCategoryDisabled={isCategoryDisabled}
        placesLoading={() => Boolean(selectedCity()) && (placesQuery.isLoading() || placesQuery.isPending())}
        placesError={() => Boolean(selectedCity()) && placesQuery.isError()}
        placesEmpty={() =>
          Boolean(selectedCity()) && placesQuery.isSuccess() && placeList().length === 0
        }
        hasNextPage={placesQuery.hasNextPage}
        isFetchingNextPage={placesQuery.isFetchingNextPage}
        fetchNextPage={() => placesQuery.fetchNextPage()}
        showEngagement={isAuthenticated}
        savedIds={savedIds}
        engagement={engagement}
        onToggleSaved={(poiId) => savePlace.mutate(poiId)}
        onRate={(poiId, stars) => ratePlace.mutate({ poiId, stars })}
        actionError={actionError}
      />

      <ExplorePlaceDetail
        t={t}
        place={openedPlace}
        isSmall={isSmall}
        onClose={() => {
          batch(() => {
            setFocusedPlaceId(null);
            setOpenedPlaceId(null);
          });
        }}
      />
    </div>
  );
}
