import { createAuth } from 'grainlet/auth';

/**
 * Add Credentials(), Google(), storage, and refresh callbacks here when your
 * backend is ready. The empty client is SSR-safe and starts unauthenticated.
 */
export const auth = createAuth({
  providers: [],
  autoRefresh: false,
});
