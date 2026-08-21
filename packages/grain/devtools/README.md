# Grainlet Devtools

Install the hook before application signals are created, then render the panel
in development:

```jsx
import {
  GrainletDevtools,
  installDevtoolsHook,
} from 'grainlet/devtools';

installDevtoolsHook();

<GrainletDevtools queryClient={queryClient} />
```

The in-app inspector shows signal/effect/owner events and Query cache state.
Do not mount it in production bundles.
