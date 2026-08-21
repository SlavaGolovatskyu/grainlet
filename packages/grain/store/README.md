# Grainlet Store

```js
import { createStore, produce, reconcile } from 'grainlet/store';

const [state, setState] = createStore({
  user: { name: 'Ada' },
  todos: [],
});

setState('user', 'name', 'Grace');
setState('todos', produce((todos) => {
  todos.push({ title: 'Ship', done: false });
}));
setState(reconcile(serverState));
```

Store proxies track properties and collection iteration independently. Multiple
changes made by one setter are batched into a single reactive flush.
