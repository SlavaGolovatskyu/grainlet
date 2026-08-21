import { AsyncLocalStorage } from 'node:async_hooks';
import { setSSRContextStorage } from './context.js';

const storage = new AsyncLocalStorage();
setSSRContextStorage(storage);
