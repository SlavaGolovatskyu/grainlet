# Grainlet Testing

`grainlet/testing` works with the DOM environment supplied by Vitest, Jest,
JSDOM, happy-dom, or a browser. It does not bundle a DOM implementation.

```js
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from 'grainlet/testing';

render(Counter);
fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
await waitFor(() => screen.getByText('1'));
cleanup();
```

Use the testing `hydrate` helper with server HTML to validate hydration without
clearing the container.
