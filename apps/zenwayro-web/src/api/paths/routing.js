/**
 * Routing HTTP paths under `/api/routing/*`
 * (global prefix `/api` is applied at bootstrap).
 *
 * Product map/route UX primarily hits trip day mutate/reorder endpoints;
 * this admin plan-route surface is still the domain HTTP contract for Valhalla
 * ordered planning.
 */
export const ROUTING_PATHS = {
  plan: '/api/routing/plan',
};
