/**
 * Dynamic entity registry HTTP paths.
 * All routes require an admin JWT.
 */
const encodePathSegment = (segment) => encodeURIComponent(segment);

export const ENTITY_REGISTRY_PATHS = {
  entities: '/api/admin/entities',
  schema: (entityKey) => `/api/admin/entities/${encodePathSegment(entityKey)}/schema`,
  records: (entityKey) => `/api/admin/entities/${encodePathSegment(entityKey)}/records`,
  record: (entityKey, id) =>
    `/api/admin/entities/${encodePathSegment(entityKey)}/records/${encodePathSegment(id)}`,
};
