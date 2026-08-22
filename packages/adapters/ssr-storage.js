import { AsyncLocalStorage } from 'node:async_hooks';
import { setSSRContextStorage } from 'grainlet/ssr';

const storage = new AsyncLocalStorage();
setSSRContextStorage(storage);

export { storage };
