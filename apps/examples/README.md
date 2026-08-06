# Signals Examples

This directory contains various examples demonstrating how to use the reactive signals system and render method.

## Examples

### 01-basic-counter.html
Basic counter example showing:
- Using `createSignal` to manage state
- Plain PascalCase component functions (auto-wrapped by `render` / JSX)
- Using `render` to mount components

### 02-todo-list.html
Todo list application demonstrating:
- Managing arrays with signals
- Dynamic rendering of lists
- Adding and removing items
- Toggling item state

### 03-timer-cleanup.html
Timer with automatic cleanup showing:
- Using `createEffect` for side effects
- Using `onCleanup` to clean up intervals
- Automatic cleanup on component unmount

### 04-computed-memo.html
Computed values example demonstrating:
- Using `createMemo` for derived values
- Automatic recalculation when dependencies change
- Multiple computed values working together

### 05-form-validation.html
Form validation example showing:
- Multiple signals working together
- Real-time validation with `createMemo`
- Conditional rendering based on validation state
- Form submission handling

### 06-component-composition.html
Component composition example demonstrating:
- Creating reusable components
- Passing props between components
- Nesting components
- Conditional rendering of child components

### 07-effects-demo.html
Effects and cleanup demonstration showing:
- How `createEffect` tracks dependencies
- Using `onCleanup` for cleanup callbacks
- Returning cleanup functions from effects
- Component-level cleanup

### 10-nested-render-isolation.html
Deep nesting + render isolation:
- App → trunks → mids → leaves, plus NestedA→B→C→DeepLeaf
- Per-component `renders` badges
- Updating one leaf should not re-run ancestors or sibling branches

### 11-async-requests.html
Async / await patterns:
- Debounced search with `fetch` + `AbortController`
- Sequential await chains (user → posts)
- Async click handlers
- Effect cleanup that aborts in-flight work

### 12-routing.html
Client-side History API routing (`grainlet/route`):
- `Router` / `Route` / `Link` / `navigate`
- `useParams` and `useLocation`
- 404 catch-all (`*`)

### 19-virtual-list.html
`VirtualList` with real picsum photos:
- Vertical / horizontal orientation
- Per-row `item r` and `img loads` badges to catch remount thrash

### 20-virtual-infinite.html
Infinite scroll on `VirtualList`:
- `onEndReached` + simulated paged API
- Appends picsum photos until `hasMore` is false

### 21-forms-provider.html
`grainlet/forms` FormProvider demo:
- `rules` with `required`, `isEmail`, `minLength`, `equalsField`
- `Field` + `ErrorMessage`, submit/reset, status banner

### 22-forms-field-array.html
`FieldArray` demo:
- `push` / `remove` on a friends list
- Per-row `validate={[required()]}`

### 23-forms-i18n.html
Translated validation messages:
- Lazy `() => t('validation.required')` on built-in validators
- EN / UK locale toggle without remounting the form

### 24-i18n-namespaces.html
`grainlet/i18n` with app-owned JSON files:
- `common`, `dashboard`, and lazy-loaded `profile` namespaces
- Deep keys such as `segment.title.key.first`
- EN / UK locale switching, interpolation, and fallback locale behavior

## Running the Examples

1. Open any HTML file in a modern web browser
2. Make sure the file paths are correct relative to your project structure
3. The examples use ES6 modules, so you may need to serve them via a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using VS Code
# Install "Live Server" extension and right-click on HTML file -> "Open with Live Server"
```

Then navigate to `http://localhost:3000/apps/examples/01-basic-counter.html`

## Key Concepts Demonstrated

- **Signals**: Reactive state management with `createSignal`
- **Effects**: Side effects with automatic dependency tracking via `createEffect`
- **Memos**: Computed/derived values with `createMemo`
- **Cleanup**: Automatic resource cleanup with `onCleanup`
- **Components**: Reusable UI as plain PascalCase functions (`render` / JSX auto-wrap)
- **Rendering**: Mounting components with `render`
- **JSX**: Write UI with JSX via Vite + `grainlet-vite`

