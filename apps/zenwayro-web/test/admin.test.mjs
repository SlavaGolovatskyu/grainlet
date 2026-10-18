import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ADMIN_NAV,
  ARTICLE_TEXT_MIN,
  buildAdminUsersParams,
  buildAiEnrichmentListParams,
  buildArticleAnalyzeRequest,
  buildCreateCityBody,
  buildEntityRecordListParams,
  buildEntityWritePayload,
  canDeleteUser,
  canGoToNextPage,
  draftsToPersist,
  ENTITY_WRITE_ERROR,
  errorText,
  filterCities,
  formatEntityCellValue,
  isCreateRecord,
  isDraftSaveable,
  isGenerationJobActive,
  profileCanAccess,
  readEntityError,
  resolveEntityRecordListQuery,
  selectEntityTableFields,
  toAssignableRoles,
  toUpdateDraftBody,
  toggleRole,
  updateGenerationConfig,
  validateImageFile,
  visibleAdminNavLinks,
} from '../src/pages/admin/admin-helpers.js';

const stringField = {
  name: 'name',
  kind: 'string',
  editable: true,
  requiredOnCreate: true,
  nullable: false,
};

test('admin nav covers every admin tool', () => {
  const hrefs = ADMIN_NAV.map((link) => link.href);
  assert.deepEqual(hrefs, [
    '/admin',
    '/admin/images',
    '/admin/ai-enrichment',
    '/admin/article-import',
    '/admin/article-import/runs',
    '/admin/cities/create',
    '/admin/users',
    '/admin/entities',
  ]);
});

test('visibleAdminNavLinks follows image and admin access', () => {
  assert.deepEqual(
    visibleAdminNavLinks({ isAdmin: false, canManageContentImages: true }).map((link) => link.href),
    ['/admin', '/admin/images'],
  );
  assert.equal(visibleAdminNavLinks({ isAdmin: true, canManageContentImages: false }).length, ADMIN_NAV.length - 1);
  assert.equal(profileCanAccess({ isAdmin: true }, 'admin'), true);
  assert.equal(profileCanAccess({ canManageContentImages: true }, 'images'), true);
  assert.equal(profileCanAccess({ isAdmin: false }, 'admin'), false);
});

test('buildCreateCityBody validates coordinates and applies the default radius', () => {
  assert.equal(buildCreateCityBody({ name: ' ', country: 'Italy', centerLat: '1', centerLng: '2' }).error, 'Name and country are required.');
  assert.match(buildCreateCityBody({ name: 'Rome', country: 'Italy', centerLat: '91', centerLng: '12' }).error, /Latitude/);
  assert.match(buildCreateCityBody({ name: 'Rome', country: 'Italy', centerLat: '41', centerLng: '200' }).error, /Longitude/);
  assert.deepEqual(
    buildCreateCityBody({ name: ' Rome ', country: ' Italy ', centerLat: '41.9', centerLng: '12.5', radiusKm: '', hasTiles: true }).body,
    { name: 'Rome', country: 'Italy', centerLat: 41.9, centerLng: 12.5, radiusKm: 15, hasTiles: true },
  );
});

test('validateImageFile allows png and jpeg under 10MB', () => {
  assert.equal(validateImageFile({ type: 'image/gif', size: 10 }), 'Only PNG and JPEG images are allowed');
  assert.equal(validateImageFile({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }), 'File must be 10MB or smaller');
  assert.equal(validateImageFile({ type: 'image/jpeg', size: 20 }), null);
});

test('buildAiEnrichmentListParams matches the source filter query', () => {
  assert.deepEqual(
    buildAiEnrichmentListParams({
      country: '',
      cityId: '',
      q: '',
      minScore: null,
      flaggedOnly: false,
      promptVersion: '',
      sort: 'enrichedAt',
      page: 2,
      pageSize: 50,
    }),
    { limit: '50', offset: '50', sort: 'enrichedAt' },
  );
  const filtered = buildAiEnrichmentListParams({
    country: ' Italy ',
    cityId: 'city-1',
    q: 'colosseum',
    minScore: 60,
    flaggedOnly: true,
    promptVersion: 'v10',
    sort: 'usefulnessScore',
    page: 1,
    pageSize: 50,
  });
  assert.equal(filtered.country, 'Italy');
  assert.equal(filtered.hasFlags, 'true');
  assert.equal(filtered.minScore, '60');
  assert.equal(filtered.sort, 'usefulnessScore');
});

test('buildArticleAnalyzeRequest requires a city and a long enough source', () => {
  assert.equal(buildArticleAnalyzeRequest({ cityId: '', inputMode: 'text', articleText: 'x', sourceTitle: '' }).error, 'Select a city first');
  assert.equal(buildArticleAnalyzeRequest({ cityId: 'c1', inputMode: 'url', articleUrl: '  ', sourceTitle: '' }).error, 'Paste an article URL');
  assert.match(
    buildArticleAnalyzeRequest({ cityId: 'c1', inputMode: 'text', articleText: 'x'.repeat(ARTICLE_TEXT_MIN - 1), sourceTitle: '' }).error,
    /40/,
  );
  assert.deepEqual(
    buildArticleAnalyzeRequest({
      cityId: 'c1',
      inputMode: 'url',
      articleUrl: ' https://example.com ',
      sourceTitle: ' Guide ',
    }).body,
    { cityId: 'c1', articleUrl: 'https://example.com', sourceTitle: 'Guide' },
  );
});

test('draft save helpers keep open selected drafts with coordinates', () => {
  const draft = {
    draftId: 'd1',
    status: 'ready',
    selected: true,
    name: ' Forum ',
    category: 'historic',
    lat: 1,
    lng: 2,
    description: ' Old ',
    address: 'Via',
    popularity: 0.4,
    photoUrl: 'https://img',
    tags: [],
  };
  assert.equal(isDraftSaveable(draft), true);
  assert.equal(isDraftSaveable({ ...draft, selected: false }), false);
  assert.equal(isDraftSaveable({ ...draft, lat: null }), false);
  assert.deepEqual(toUpdateDraftBody(draft), {
    name: 'Forum',
    category: 'historic',
    lat: 1,
    lng: 2,
    description: 'Old',
    address: 'Via',
    popularity: 0.4,
    photoUrl: 'https://img',
  });
  assert.deepEqual(
    draftsToPersist([draft, { ...draft, draftId: 'd2', status: 'saved' }], new Set(['d1', 'd2']), ['d1', 'd2']).map((item) => item.draftId),
    ['d1'],
  );
});

test('user list params, roles, and delete eligibility', () => {
  assert.deepEqual(
    buildAdminUsersParams({ query: ' ada ', provider: 'google', emailVerified: 'true', page: 2, limit: 20 }),
    { page: '2', limit: '20', q: 'ada', provider: 'google', emailVerified: 'true' },
  );
  assert.deepEqual(toAssignableRoles(['admin', 'content_editor']), ['content_editor']);
  assert.deepEqual(toggleRole(['content_editor'], 'content_contributor', true), ['content_editor', 'content_contributor']);
  assert.deepEqual(toggleRole(['content_editor'], 'content_editor', false), []);
  assert.equal(canDeleteUser({ id: 'me', isAdmin: true }, { id: 'other', isAdmin: false }), true);
  assert.equal(canDeleteUser({ id: 'me', isAdmin: true }, { id: 'me', isAdmin: false }), false);
  assert.equal(canDeleteUser({ id: 'me', isAdmin: true }, { id: 'other', isAdmin: true }), false);
});

test('entity record query resets the page when the search changes', () => {
  assert.deepEqual(resolveEntityRecordListQuery(4, '  forum  ', ''), { page: 1, search: 'forum' });
  assert.deepEqual(resolveEntityRecordListQuery(4, 'forum', 'forum'), { page: 4, search: 'forum' });
  assert.deepEqual(buildEntityRecordListParams(2, 'rome'), { page: '2', limit: '20', q: 'rome' });
  assert.equal(canGoToNextPage(1, 20, 21), true);
  assert.equal(canGoToNextPage(2, 20, 21), false);
  assert.equal(isCreateRecord(undefined), true);
  assert.equal(isCreateRecord('new'), true);
  assert.equal(isCreateRecord('rec-1'), false);
});

test('entity table columns and write payload follow the registry rules', () => {
  const schema = {
    idField: 'id',
    fields: [
      { name: 'id', kind: 'uuid', editable: false },
      { name: 'title', kind: 'string', editable: true },
      { name: 'notes', kind: 'text', editable: true },
      { name: 'count', kind: 'number', editable: true },
      { name: 'meta', kind: 'json', editable: false },
      { name: 'flag', kind: 'boolean', editable: true },
    ],
  };
  assert.deepEqual(selectEntityTableFields(schema).map((field) => field.name), ['id', 'title', 'notes', 'count', 'flag']);
  assert.equal(formatEntityCellValue(null), '');
  assert.equal(formatEntityCellValue({ a: 1 }), '{"a":1}');

  const invalid = buildEntityWritePayload({
    fields: [stringField],
    draft: { name: '  ' },
    initialDraft: { name: '' },
    mode: 'create',
  });
  assert.equal(invalid.status, 'invalid');
  assert.equal(invalid.fieldErrors[0].message, ENTITY_WRITE_ERROR.REQUIRED);

  const unchanged = buildEntityWritePayload({
    fields: [{ ...stringField, requiredOnCreate: false }],
    draft: { name: 'Rome' },
    initialDraft: { name: 'Rome' },
    mode: 'update',
  });
  assert.equal(unchanged.status, 'unchanged');

  const ready = buildEntityWritePayload({
    fields: [
      { name: 'count', kind: 'number', editable: true, nullable: true },
      { name: 'active', kind: 'boolean', editable: true },
      { name: 'meta', kind: 'json', editable: false },
    ],
    draft: { count: '12', active: true, meta: '{}' },
    initialDraft: { count: '', active: false, meta: '' },
    mode: 'update',
  });
  assert.deepEqual(ready, { status: 'ready', body: { values: { count: 12, active: true } } });
});

test('generation config and error readers', () => {
  assert.equal(isGenerationJobActive('running'), true);
  assert.equal(isGenerationJobActive('completed'), false);
  assert.deepEqual(
    updateGenerationConfig({ includeRoutes: true, popularity: { durationDays: 1, poisPerDay: 2 }, nearby: { durationDays: 3, poisPerDay: 4 } }, 'nearby', 'poisPerDay', 6).nearby,
    { durationDays: 3, poisPerDay: 6 },
  );
  assert.equal(errorText({ message: 'nope' }, 'fallback'), 'nope');
  assert.deepEqual(readEntityError({ message: 'bad', data: { fieldErrors: [{ field: 'name', message: 'Required' }] } }, 'fallback').fieldErrors, [
    { field: 'name', message: 'Required' },
  ]);
  assert.deepEqual(filterCities([{ id: '1', name: 'Rome', country: 'Italy' }], 'rom'), [{ id: '1', name: 'Rome', country: 'Italy' }]);
});
