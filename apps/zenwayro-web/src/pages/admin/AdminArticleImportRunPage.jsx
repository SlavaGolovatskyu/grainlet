import { createEffect, createSignal, For, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { useParams } from 'grainlet/route';
import { ADMIN_PATHS, apiClient, IMAGE_PATHS } from '../../api.js';
import {
  AdminShell,
  adminText,
  buttonClass,
  DataRegion,
  fieldClass,
  panelClass,
  secondaryButtonClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import {
  articleRunTitle,
  draftsToPersist,
  errorText,
  isClosedDraft,
  isDraftSaveable,
  isOpenDraft,
  parseOptionalNumber,
  patchDraft,
  POI_CATEGORIES,
  toUpdateDraftBody,
  validateImageFile,
  withDraftSelection,
} from './admin-helpers.js';

export function AdminArticleImportRunPage() {
  const access = useAdminAccess('admin');
  const params = useParams();
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const runId = () => params().runId;
  return (
    <AdminShell
      access={access}
      showBack
      title={t('admin.runTitle', 'Import run')}
      description={runId() || t('admin.missingRun', 'Missing run id.')}
    >
      <Show when={runId()} fallback={<p class="text-sm text-red-600">{t('admin.missingRun', 'Missing run id.')}</p>}>
        <RunBody runId={runId()} />
      </Show>
    </AdminShell>
  );
}

function RunBody(props) {
  const i18n = useI18n();
  const client = useQueryClient();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [drafts, setDrafts] = createSignal([]);
  const [dirty, setDirty] = createSignal(new Set());
  const [localError, setLocalError] = createSignal('');
  const [saveResult, setSaveResult] = createSignal(null);
  const [uploadPoi, setUploadPoi] = createSignal(null);

  const run = useQuery(() => ({
    queryKey: ['admin', 'article-import', 'run', props.runId],
    queryFn: ({ signal }) => apiClient.get(ADMIN_PATHS.articleImportRunById(props.runId), { signal }),
  }));

  createEffect(() => {
    const data = run.data();
    if (!data || dirty().size > 0) return;
    setDrafts(withDraftSelection(data.drafts));
  });

  const save = useMutation({
    mutationFn: async ({ nextDrafts, dirtyIds, draftIds }) => {
      let current = nextDrafts;
      for (const draft of draftsToPersist(nextDrafts, dirtyIds, draftIds)) {
        const response = await apiClient.patch(ADMIN_PATHS.articleImportDraftById(draft.draftId), toUpdateDraftBody(draft));
        current = current.map((item) =>
          item.draftId === draft.draftId ? { ...response.draft, selected: item.selected } : item,
        );
      }
      const result = await apiClient.post(ADMIN_PATHS.articleImportRunSave(props.runId), { draftIds });
      return { result, current, draftIds };
    },
    onSuccess: ({ result, current, draftIds }) => {
      setDrafts(current);
      setDirty((prev) => {
        const next = new Set(prev);
        draftIds.forEach((id) => next.delete(id));
        return next;
      });
      setSaveResult(result);
      setLocalError('');
      client.invalidateQueries({ queryKey: ['admin', 'article-import', 'run', props.runId] });
    },
    onError: (error) => setLocalError(errorText(error, t('admin.saveFailed', 'Save failed'))),
  });

  const discard = useMutation({
    mutationFn: (draftId) => apiClient.post(ADMIN_PATHS.articleImportDraftDiscard(draftId)),
    onSuccess: (response) => {
      setDrafts((prev) => prev.map((draft) => (draft.draftId === response.draft.draftId ? { ...response.draft, selected: false } : draft)));
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(response.draft.draftId);
        return next;
      });
      client.invalidateQueries({ queryKey: ['admin', 'article-import', 'run', props.runId] });
    },
    onError: (error) => setLocalError(errorText(error, t('admin.discardFailed', 'Discard failed'))),
  });

  const upload = useMutation({
    mutationFn: (body) => apiClient.post(IMAGE_PATHS.poiUpload, body),
    onSuccess: (response) => {
      const target = uploadPoi();
      setSaveResult((prev) => {
        if (!prev || !target) return prev;
        return {
          ...prev,
          saved: prev.saved.map((poi) => (poi.id === target.id ? { ...poi, photoUrl: response.imageCdnUrl } : poi)),
        };
      });
      setUploadPoi(null);
      setLocalError('');
    },
    onError: (error) => setLocalError(errorText(error, t('admin.poiImageFailed', 'POI image upload failed'))),
  });

  function edit(draftId, patch) {
    setDrafts((prev) => patchDraft(prev, draftId, patch));
    setDirty((prev) => {
      const next = new Set(prev);
      next.add(draftId);
      return next;
    });
  }

  const openDrafts = () => drafts().filter(isOpenDraft);
  const closedDrafts = () => drafts().filter(isClosedDraft);
  const selectedSaveable = () => drafts().filter(isDraftSaveable);
  const header = () => run.data()?.run;

  function onSave() {
    const selected = selectedSaveable();
    if (selected.length === 0) {
      setLocalError(t('admin.selectDraft', 'Select at least one draft with name, description, and coordinates'));
      return;
    }
    setLocalError('');
    save.mutate({
      nextDrafts: drafts(),
      dirtyIds: dirty(),
      draftIds: selected.map((draft) => draft.draftId),
    });
  }

  function onUploadFile(file) {
    const target = uploadPoi();
    if (!target) return;
    const validation = validateImageFile(file);
    if (validation) {
      setLocalError(validation);
      return;
    }
    const body = new FormData();
    body.append('file', file);
    body.append('poiId', target.id);
    upload.mutate(body);
  }

  return (
    <DataRegion
      pending={run.isPending()}
      error={run.error()}
      errorFallback={t('admin.runError', 'Could not load this import run.')}
      empty={!run.isPending() && !header()}
      emptyText={t('admin.missingRun', 'Missing run id.')}
    >
      <div class="space-y-6">
        <Show when={header()}>
          {(value) => (
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{articleRunTitle(value)}</h2>
              <p class="mt-1 text-sm text-gray-500">
                {value.cityName}, {value.country} · {value.status} · {value.readyCount} {t('admin.readyCount', 'ready')} · {value.needsReviewCount} {t('admin.needsReview', 'need review')}
              </p>
            </div>
          )}
        </Show>
        <Show when={localError()}>
          {(message) => <p class="text-sm text-red-600">{message}</p>}
        </Show>
        <Show when={openDrafts().length === 0}>
          <p class="text-sm text-gray-500">{t('admin.noOpenDrafts', 'No open drafts left in this run.')}</p>
        </Show>
        <Show when={openDrafts().length > 0}>
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">{t('admin.reviewDrafts', 'Review drafts')}</h2>
              <button type="button" class={buttonClass} disabled={save.isPending() || selectedSaveable().length === 0} onClick={onSave}>
                {save.isPending()
                  ? t('admin.saving', 'Saving…')
                  : `${t('admin.saveSelected', 'Save selected')} (${selectedSaveable().length})`}
              </button>
            </div>
            <For each={openDrafts()} keyed={(draft) => draft.draftId}>
              {(draft) => (
                <DraftCard
                  draft={draft}
                  discarding={discard.isPending()}
                  onChange={(patch) => edit(draft.draftId, patch)}
                  onDiscard={() => discard.mutate(draft.draftId)}
                />
              )}
            </For>
          </div>
        </Show>
        <Show when={closedDrafts().length > 0}>
          <div class="space-y-2">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">{t('admin.closedDrafts', 'Closed drafts')}</h2>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <For each={closedDrafts()}>
                {(draft) => (
                  <li class={panelClass}>
                    {draft.name} · {draft.status}
                    {draft.savedPoiId ? ` · ${draft.savedPoiId}` : ''}
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
        <Show when={saveResult()}>
          {(result) => <SaveResult result={result} uploadPoi={uploadPoi()} pending={upload.isPending()} onUpload={setUploadPoi} onFile={onUploadFile} />}
        </Show>
      </div>
    </DataRegion>
  );
}

function DraftCard(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const draft = () => props.draft;
  return (
    <form class={`${panelClass} space-y-3`} onSubmit={(event) => event.preventDefault()}>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft().selected} onChange={(event) => props.onChange({ selected: event.target.checked })} />
        {draft().status}
        <Show when={(draft().statusReasons ?? []).length > 0}>
          <span class="text-gray-500">{(draft().statusReasons ?? []).join(', ')}</span>
        </Show>
      </label>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label={t('admin.name', 'Name')} value={draft().name} onInput={(value) => props.onChange({ name: value })} />
        <label class="block text-sm text-gray-700 dark:text-gray-300">
          {t('admin.category', 'Category')}
          <select class={fieldClass} value={draft().category} onChange={(event) => props.onChange({ category: event.target.value })}>
            <For each={POI_CATEGORIES}>{(category) => <option value={category}>{category}</option>}</For>
          </select>
        </label>
        <Field label={t('admin.latitude', 'Latitude')} type="number" value={draft().lat ?? ''} onInput={(value) => props.onChange({ lat: parseOptionalNumber(value) })} />
        <Field label={t('admin.longitude', 'Longitude')} type="number" value={draft().lng ?? ''} onInput={(value) => props.onChange({ lng: parseOptionalNumber(value) })} />
        <Field label={t('admin.address', 'Address')} value={draft().address ?? ''} onInput={(value) => props.onChange({ address: value })} />
        <Field label={t('admin.popularity', 'Popularity (0–1)')} type="number" value={draft().popularity ?? ''} onInput={(value) => props.onChange({ popularity: parseOptionalNumber(value) })} />
        <Field label={t('admin.photoUrl', 'Photo URL')} value={draft().photoUrl ?? ''} onInput={(value) => props.onChange({ photoUrl: value })} />
        <Field label={t('admin.phone', 'Phone')} value={draft().phone ?? ''} onInput={(value) => props.onChange({ phone: value })} />
        <Field label={t('admin.website', 'Website')} value={draft().website ?? ''} onInput={(value) => props.onChange({ website: value })} />
        <Field label={t('admin.openingHours', 'Opening hours')} value={draft().openingHours ?? ''} onInput={(value) => props.onChange({ openingHours: value })} />
        <Field label={t('admin.fee', 'Fee')} value={draft().fee ?? ''} onInput={(value) => props.onChange({ fee: value })} />
      </div>
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {t('admin.description', 'Description')}
        <textarea class={`${fieldClass} min-h-24`} value={draft().description} onInput={(event) => props.onChange({ description: event.target.value })} />
      </label>
      <Show when={(draft().imageCandidates ?? []).length > 0}>
        <div class="space-y-1 text-sm">
          <p class="text-gray-500">{t('admin.imageCandidates', 'Image candidates')}</p>
          <For each={draft().imageCandidates ?? []}>
            {(image) => (
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name={`photo-${draft().draftId}`}
                  checked={draft().photoUrl === image.url}
                  onChange={() => props.onChange({ photoUrl: image.url })}
                />
                <span class="truncate">{image.source}: {image.url}</span>
              </label>
            )}
          </For>
        </div>
      </Show>
      <button type="button" class={secondaryButtonClass} disabled={props.discarding} onClick={props.onDiscard}>
        {t('admin.discard', 'Discard')}
      </button>
    </form>
  );
}

function Field(props) {
  return (
    <label class="block text-sm text-gray-700 dark:text-gray-300">
      {props.label}
      <input class={fieldClass} type={props.type || 'text'} step={props.type === 'number' ? 'any' : undefined} value={props.value} onInput={(event) => props.onInput(event.target.value)} />
    </label>
  );
}

function SaveResult(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const result = () => props.result;
  return (
    <div class={`${panelClass} space-y-3 text-sm`}>
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">{t('admin.saveResult', 'Save result')}</h2>
      <Show when={(result().saved ?? []).length === 0}>
        <p class="text-gray-500">{t('admin.noneSaved', 'No POIs were saved.')}</p>
      </Show>
      <For each={result().saved ?? []}>
        {(poi) => (
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span>{poi.name}</span>
            <button type="button" class={secondaryButtonClass} onClick={() => props.onUpload({ id: poi.id, name: poi.name })}>
              {t('admin.uploadPoiImage', 'Upload POI image')}
            </button>
          </div>
        )}
      </For>
      <For each={result().skippedDuplicates ?? []}>
        {(item) => (
          <p class="text-amber-700">
            {item.name}: {item.reason}
          </p>
        )}
      </For>
      <For each={result().errors ?? []}>
        {(item) => (
          <p class="text-red-600">
            {item.name}: {item.reason}
          </p>
        )}
      </For>
      <Show when={props.uploadPoi}>
        {(target) => (
          <label class="block text-gray-700 dark:text-gray-300">
            {t('admin.uploadPoiImage', 'Upload POI image')} — {target.name}
            <input
              class={fieldClass}
              type="file"
              accept="image/png,image/jpeg"
              disabled={props.pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) props.onFile(file);
              }}
            />
          </label>
        )}
      </Show>
    </div>
  );
}
