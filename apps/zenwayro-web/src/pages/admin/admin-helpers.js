export const DEFAULT_RADIUS_KM = 15;
export const IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png'];
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const ADMIN_AI_PAGE_SIZE = 50;
export const ADMIN_USERS_PAGE_SIZE = 20;
export const ADMIN_IMAGES_POI_LIMIT = 250;
export const ARTICLE_TEXT_MIN = 40;
export const ENTITY_DEFAULT_PAGE = 1;
export const ENTITY_DEFAULT_LIMIT = 20;
export const ENTITY_SEARCH_MAX = 200;
export const ENTITY_TABLE_EXTRA_LIMIT = 4;
export const GENERATION_POLL_MS = 2500;
export const USER_DETAIL_PAGE_SIZE = 20;

export const POI_CATEGORIES = [
  'museum',
  'park',
  'restaurant',
  'cafe',
  'bar',
  'gallery',
  'attraction',
  'historic',
  'viewpoint',
  'nightlife',
  'shopping',
  'beach',
  'religious',
];

export const ASSIGNABLE_ROLES = ['content_editor', 'content_contributor'];

export const ENTITY_WRITE_ERROR = {
  REQUIRED: 'Field is required',
  FINITE_NUMBER: 'Value must be a finite number',
  DATETIME: 'Value must be an ISO-8601 datetime',
  NOT_NULL: 'Field cannot be null',
  BOOLEAN: 'Value must be a boolean',
};

const WRITABLE_KINDS = ['string', 'text', 'number', 'boolean', 'date', 'datetime', 'enum', 'uuid'];
const PREFERRED_TABLE_KINDS = ['string', 'text'];
const NON_TABLE_KINDS = ['json', 'array', 'geometry'];

export const DEFAULT_CITY_FORM = {
  name: '',
  country: '',
  centerLat: '',
  centerLng: '',
  radiusKm: '15',
  hasTiles: false,
};

export const ADMIN_NAV = [
  {
    href: '/admin',
    titleKey: 'nav.admin',
    title: 'Admin',
    description: 'Use this page as a navigation hub for all admin tooling.',
    access: 'hub',
  },
  {
    href: '/admin/images',
    titleKey: 'nav.contentImages',
    title: 'Manage Images',
    description: 'Upload hero images for cities and POIs.',
    access: 'images',
  },
  {
    href: '/admin/ai-enrichment',
    titleKey: 'admin.nav.aiEnrichment',
    title: 'AI enrichment quality',
    description: 'Monitor enriched POIs and compare AI runs across models.',
    access: 'admin',
  },
  {
    href: '/admin/article-import',
    titleKey: 'admin.nav.articleImport',
    title: 'Article POI import',
    description: 'Extract, review, and save unique POIs from travel articles.',
    access: 'admin',
  },
  {
    href: '/admin/article-import/runs',
    titleKey: 'admin.nav.articleImportRuns',
    title: 'Article import drafts',
    description: 'Resume saved analyze runs without re-calling AI.',
    access: 'admin',
  },
  {
    href: '/admin/cities/create',
    titleKey: 'admin.nav.createCity',
    title: 'Create City',
    description: 'Add a new city and queue POI ingestion.',
    access: 'admin',
  },
  {
    href: '/admin/users',
    titleKey: 'admin.nav.users',
    title: 'Users',
    description: 'Browse registered users and apply filters.',
    access: 'admin',
  },
  {
    href: '/admin/entities',
    titleKey: 'admin.nav.entities',
    title: 'Entity registry',
    description: 'Edit registered backend entities from one screen.',
    access: 'admin',
  },
];

export function errorText(error, fallback) {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}

export function readEntityError(error, fallback) {
  const fieldErrors = Array.isArray(error?.data?.fieldErrors) ? error.data.fieldErrors : [];
  return { message: errorText(error, fallback), fieldErrors };
}

export function profileCanAccess(user, kind) {
  if (!user) return false;
  if (kind === 'images') return user.canManageContentImages === true;
  if (kind === 'hub') return user.isAdmin === true || user.canManageContentImages === true;
  return user.isAdmin === true;
}

export function visibleAdminNavLinks(profile) {
  const isAdmin = profile?.isAdmin === true;
  const images = profile?.canManageContentImages === true;
  return ADMIN_NAV.filter((link) => {
    if (link.access === 'images') return images;
    if (link.access === 'admin') return isAdmin;
    return isAdmin || images;
  });
}

export function articleRunHref(runId) {
  return `/admin/article-import/runs/${encodeURIComponent(runId)}`;
}

export function entityRecordsHref(entityKey) {
  return `/admin/entities/${encodeURIComponent(entityKey)}`;
}

export function entityCreateHref(entityKey) {
  return `/admin/entities/${encodeURIComponent(entityKey)}/new`;
}

export function entityRecordHref(entityKey, recordId) {
  return `/admin/entities/${encodeURIComponent(entityKey)}/${encodeURIComponent(recordId)}`;
}

export function isCreateRecord(recordId) {
  return recordId == null || recordId === '' || recordId === 'new';
}

export function rowMatchesFilter(haystacks, query) {
  if (!query) return true;
  return haystacks.some((part) => String(part).includes(query));
}

export function filterCities(cities, query) {
  const q = query.trim().toLowerCase();
  if (!q) return cities ?? [];
  return (cities ?? []).filter((city) =>
    rowMatchesFilter(
      [String(city.name ?? '').toLowerCase(), String(city.country ?? '').toLowerCase(), String(city.id ?? '').toLowerCase()],
      q,
    ),
  );
}

export function filterPois(pois, query) {
  const q = query.trim().toLowerCase();
  if (!q) return pois ?? [];
  return (pois ?? []).filter((poi) =>
    rowMatchesFilter(
      [
        String(poi.name ?? '').toLowerCase(),
        String(poi.category ?? '').toLowerCase(),
        String(poi.id ?? '').toLowerCase(),
        String(poi.city ?? '').toLowerCase(),
      ],
      q,
    ),
  );
}

export function validateImageFile(file) {
  if (!file || !IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return 'Only PNG and JPEG images are allowed';
  }
  if (file.size > IMAGE_MAX_BYTES) return 'File must be 10MB or smaller';
  return null;
}

export function buildCreateCityBody(form) {
  const name = String(form?.name ?? '').trim();
  const country = String(form?.country ?? '').trim();
  const lat = parseFloat(form?.centerLat);
  const lng = parseFloat(form?.centerLng);
  const radius = parseFloat(form?.radiusKm);
  if (!name || !country) return { error: 'Name and country are required.' };
  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    return { error: 'Latitude must be between -90 and 90.' };
  }
  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    return { error: 'Longitude must be between -180 and 180.' };
  }
  return {
    body: {
      name,
      country,
      centerLat: lat,
      centerLng: lng,
      radiusKm: Number.isNaN(radius) ? DEFAULT_RADIUS_KM : radius,
      hasTiles: Boolean(form.hasTiles),
    },
  };
}

export function buildAiEnrichmentListParams(input) {
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = input.pageSize ?? ADMIN_AI_PAGE_SIZE;
  const params = {
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
    sort: input.sort || 'enrichedAt',
  };
  const country = String(input.country ?? '').trim();
  const cityId = String(input.cityId ?? '').trim();
  const q = String(input.q ?? '').trim();
  const promptVersion = String(input.promptVersion ?? '').trim();
  if (country) params.country = country;
  if (cityId) params.cityId = cityId;
  if (q) params.q = q;
  if (input.minScore !== null && input.minScore !== undefined && input.minScore !== '') {
    params.minScore = String(input.minScore);
  }
  if (input.flaggedOnly) params.hasFlags = 'true';
  if (promptVersion) params.promptVersion = promptVersion;
  return params;
}

export function buildArticleAnalyzeRequest(input) {
  const cityId = String(input?.cityId ?? '').trim();
  if (!cityId) return { error: 'Select a city first' };
  const sourceTitle = String(input.sourceTitle ?? '').trim();
  if (input.inputMode === 'url') {
    const articleUrl = String(input.articleUrl ?? '').trim();
    if (!articleUrl) return { error: 'Paste an article URL' };
    return { body: { cityId, articleUrl, ...(sourceTitle ? { sourceTitle } : {}) } };
  }
  const articleText = String(input.articleText ?? '').trim();
  if (articleText.length < ARTICLE_TEXT_MIN) {
    return { error: 'Paste at least 40 characters of article text' };
  }
  return { body: { cityId, articleText, ...(sourceTitle ? { sourceTitle } : {}) } };
}

export function isOpenDraft(draft) {
  return draft?.status === 'ready' || draft?.status === 'needs_review';
}

export function isClosedDraft(draft) {
  return draft?.status === 'saved' || draft?.status === 'discarded';
}

export function isDraftSaveable(draft) {
  return Boolean(
    draft?.selected &&
      isOpenDraft(draft) &&
      draft.lat != null &&
      draft.lng != null &&
      String(draft.name ?? '').trim().length > 0 &&
      String(draft.description ?? '').trim().length > 0,
  );
}

export function toUpdateDraftBody(draft) {
  const body = {
    name: String(draft.name ?? '').trim(),
    category: draft.category,
    lat: draft.lat,
    lng: draft.lng,
    description: String(draft.description ?? '').trim(),
  };
  if (draft.openingHours != null) body.openingHours = draft.openingHours;
  if (draft.phone != null) body.phone = draft.phone;
  if (draft.website != null) body.website = draft.website;
  if (draft.address != null) body.address = draft.address;
  if (draft.fee != null) body.fee = draft.fee;
  if (draft.admission) body.admission = draft.admission;
  if (draft.popularity != null) body.popularity = draft.popularity;
  if (Array.isArray(draft.tags) && draft.tags.length > 0) body.tags = draft.tags;
  if (draft.photoUrl != null) body.photoUrl = draft.photoUrl;
  return body;
}

export function draftsToPersist(drafts, dirtyIds, draftIds) {
  const dirty = dirtyIds instanceof Set ? dirtyIds : new Set(dirtyIds ?? []);
  return (drafts ?? []).filter(
    (draft) => draftIds.includes(draft.draftId) && dirty.has(draft.draftId) && isOpenDraft(draft),
  );
}

export function withDraftSelection(drafts) {
  return (drafts ?? []).map((draft) => ({ ...draft, selected: Boolean(draft.selected) }));
}

export function patchDraft(drafts, draftId, patch) {
  return (drafts ?? []).map((draft) => (draft.draftId === draftId ? { ...draft, ...patch } : draft));
}

export function parseOptionalNumber(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function articleRunTitle(run) {
  const title = run?.sourceTitle?.trim();
  if (title) return title;
  if (run?.sourceUrl) return run.sourceUrl;
  return `${run?.cityName ?? ''}, ${run?.country ?? ''}`;
}

export function formatTimestamp(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export function buildAdminUsersParams({ query, provider, emailVerified, page, limit }) {
  const params = {
    page: String(page),
    limit: String(limit),
  };
  const q = String(query ?? '').trim();
  if (q) params.q = q;
  if (provider) params.provider = provider;
  if (emailVerified) params.emailVerified = emailVerified;
  return params;
}

export function toAssignableRoles(roles) {
  return (roles ?? []).filter((role) => role === 'content_editor' || role === 'content_contributor');
}

export function toggleRole(current, role, checked) {
  const roles = current ?? [];
  if (checked) return roles.includes(role) ? roles : [...roles, role];
  return roles.filter((item) => item !== role);
}

export function canDeleteUser(actor, user) {
  return Boolean(actor?.isAdmin && user && !user.isAdmin && user.id !== actor.id);
}

export function totalPages(total, limit) {
  if (!limit) return 1;
  return Math.max(1, Math.ceil(Number(total) / limit) || 1);
}

export function canGoToNextPage(page, limit, total) {
  return page * limit < total;
}

export function canGoToPreviousPage(page) {
  return page > 1;
}

export function isGenerationJobActive(status) {
  return status === 'pending' || status === 'running';
}

export function updateGenerationConfig(config, strategy, field, value) {
  if (!config) return config;
  return {
    ...config,
    [strategy]: { ...config[strategy], [field]: value },
  };
}

export function setGenerationIncludeRoutes(config, includeRoutes) {
  if (!config) return config;
  return { ...config, includeRoutes: Boolean(includeRoutes) };
}

export function normalizeEntitySearch(search) {
  return String(search ?? '').trim().slice(0, ENTITY_SEARCH_MAX);
}

export function resolveEntityRecordListQuery(page, search, previousSearch) {
  const nextSearch = normalizeEntitySearch(search);
  const previous = normalizeEntitySearch(previousSearch);
  if (nextSearch !== previous) return { page: ENTITY_DEFAULT_PAGE, search: nextSearch };
  const safe = !Number.isFinite(page) || page < ENTITY_DEFAULT_PAGE ? ENTITY_DEFAULT_PAGE : Math.floor(page);
  return { page: safe, search: nextSearch };
}

export function buildEntityRecordListParams(page, search) {
  const query = resolveEntityRecordListQuery(page, search, search);
  const params = {
    page: String(query.page),
    limit: String(ENTITY_DEFAULT_LIMIT),
  };
  if (query.search) params.q = query.search;
  return params;
}

export function entityCapabilitiesLabel(capabilities) {
  const parts = ['list', 'get'];
  if (capabilities?.create) parts.push('create');
  if (capabilities?.update) parts.push('update');
  if (capabilities?.delete) parts.push('delete');
  return parts.join(', ');
}

export function isEntityFieldSubmittable(field) {
  return Boolean(field?.editable && WRITABLE_KINDS.includes(field.kind));
}

export function entityFieldControl(field) {
  if (field?.kind === 'boolean') return 'checkbox';
  if (!isEntityFieldSubmittable(field)) return 'readonly';
  if (field.kind === 'text') return 'textarea';
  if (field.kind === 'number') return 'number';
  if (field.kind === 'date') return 'date';
  if (field.kind === 'datetime') return 'datetime';
  if (field.kind === 'enum') return 'select';
  return 'input';
}

export function selectEntityTableFields(schema) {
  const fields = schema?.fields ?? [];
  const idField = fields.find((field) => field.name === schema?.idField);
  const others = fields.filter(
    (field) => field.name !== schema?.idField && !NON_TABLE_KINDS.includes(field.kind),
  );
  const preferred = others.filter((field) => PREFERRED_TABLE_KINDS.includes(field.kind));
  const rest = others.filter((field) => !PREFERRED_TABLE_KINDS.includes(field.kind));
  const extra = [...preferred, ...rest].slice(0, ENTITY_TABLE_EXTRA_LIMIT);
  return idField ? [idField, ...extra] : extra;
}

export function formatEntityCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

export function isoToDatetimeLocalValue(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
}

export function datetimeLocalValueToIso(local) {
  if (String(local ?? '').trim() === '') return null;
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function entityFormInitialValues(fields, values) {
  const draft = {};
  for (const field of fields ?? []) {
    const raw = values?.[field.name];
    if (field.kind === 'boolean') {
      draft[field.name] = raw === true;
    } else if (field.kind === 'datetime' && typeof raw === 'string') {
      draft[field.name] = isoToDatetimeLocalValue(raw);
    } else if (raw == null) {
      draft[field.name] = '';
    } else if (typeof raw === 'object') {
      draft[field.name] = JSON.stringify(raw, null, 2);
    } else {
      draft[field.name] = String(raw);
    }
  }
  return draft;
}

function blankText(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function convertBoolean(value, mode, dirty) {
  if (mode === 'update' && !dirty) return { status: 'omit' };
  if (typeof value !== 'boolean') return { status: 'error', message: ENTITY_WRITE_ERROR.BOOLEAN };
  return { status: 'value', value };
}

function convertBlank(field, mode) {
  if (mode === 'create') {
    if (field.requiredOnCreate) return { status: 'error', message: ENTITY_WRITE_ERROR.REQUIRED };
    return { status: 'omit' };
  }
  if (field.kind === 'string' || field.kind === 'text') return { status: 'value', value: '' };
  if (field.nullable) return { status: 'value', value: null };
  return { status: 'error', message: ENTITY_WRITE_ERROR.NOT_NULL };
}

function convertText(field, text) {
  if (field.kind === 'number') {
    const parsed = Number(text.trim());
    if (!Number.isFinite(parsed)) return { status: 'error', message: ENTITY_WRITE_ERROR.FINITE_NUMBER };
    return { status: 'value', value: parsed };
  }
  if (field.kind === 'datetime') {
    const iso = datetimeLocalValueToIso(text);
    if (!iso) return { status: 'error', message: ENTITY_WRITE_ERROR.DATETIME };
    return { status: 'value', value: iso };
  }
  return { status: 'value', value: text };
}

function convertEditableValue(field, value, mode, dirty) {
  if (field.kind === 'boolean') return convertBoolean(value, mode, dirty);
  if (mode === 'update' && !dirty) return { status: 'omit' };
  if (blankText(value)) return convertBlank(field, mode);
  return convertText(field, typeof value === 'string' ? value : '');
}

export function buildEntityWritePayload({ fields, draft, initialDraft, mode }) {
  const values = {};
  const fieldErrors = [];
  let included = 0;
  for (const field of fields ?? []) {
    if (!isEntityFieldSubmittable(field)) continue;
    const current = draft?.[field.name];
    const initial = initialDraft?.[field.name];
    const converted = convertEditableValue(field, current, mode, current !== initial);
    if (converted.status === 'error') {
      fieldErrors.push({ field: field.name, message: converted.message });
      continue;
    }
    if (converted.status === 'omit') continue;
    values[field.name] = converted.value;
    included += 1;
  }
  if (fieldErrors.length > 0) return { status: 'invalid', fieldErrors };
  if (mode === 'update' && included === 0) return { status: 'unchanged' };
  return { status: 'ready', body: { values } };
}

export function detailPageParams(page = 1, limit = USER_DETAIL_PAGE_SIZE) {
  return { page: String(page), limit: String(limit) };
}
