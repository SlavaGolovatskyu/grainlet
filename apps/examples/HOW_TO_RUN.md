# How to Run Examples

## Quick Start

### Option 1: Using Vite (Recommended for JSX Examples)

Most examples (01-07) use JSX syntax and require Vite to transform them.

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the Vite dev server**:
   ```bash
   npm run dev
   ```

3. **Open examples in browser**:
   - Vite will start a server (usually at `http://localhost:3000`)
   - Navigate to examples:
     - `http://localhost:3000/apps/examples/01-basic-counter.html`
     - `http://localhost:3000/apps/examples/02-todo-list.html`
     - `http://localhost:3000/apps/examples/03-timer-cleanup.html`
     - etc.
   - Or use the index page: `http://localhost:3000/index.html`

### Option 2: Direct File Access (Limited)

Only example `08-jsx-counter.html` works without a build tool (uses `jsx()` function directly).

1. **Open directly in browser**:
   - Right-click `apps/examples/08-jsx-counter.html`
   - Select "Open with" → Your browser
   - **Note:** This only works for example 08. Examples 01-07 require Vite.

## Available Examples

| Example | File | Description | Requires Vite? |
|---------|------|-------------|----------------|
| 01 | `01-basic-counter.html` | Basic counter with signals | ✅ Yes |
| 02 | `02-todo-list.html` | Todo list with array management | ✅ Yes |
| 03 | `03-timer-cleanup.html` | Timer with effects and cleanup | ✅ Yes |
| 04 | `04-computed-memo.html` | Calculator with computed values | ✅ Yes |
| 05 | `05-form-validation.html` | Form with reactive validation | ✅ Yes |
| 06 | `06-component-composition.html` | Nested components | ✅ Yes |
| 07 | `07-effects-demo.html` | Effects and cleanup demo | ✅ Yes |
| 08 | `08-jsx-counter.html` | Counter using jsx() directly | ❌ No |
| 09 | `09-jsx-counter-vite.html` | Counter with full JSX syntax | ✅ Yes |
| 10 | `10-nested-render-isolation.html` | Deep nesting; only owning leaf re-renders | ✅ Yes |
| 11 | `11-async-requests.html` | async/await fetch, debounce, AbortController | ✅ Yes |
| 12 | `12-routing.html` | History API router — open **`/routing`** | ✅ Yes |
| 21 | `21-forms-provider.html` | `grainlet/forms` FormProvider + rules | ✅ Yes |
| 22 | `22-forms-field-array.html` | `FieldArray` push / remove | ✅ Yes |
| 23 | `23-forms-i18n.html` | Lazy i18n validator messages (EN/UK) | ✅ Yes |
| 24 | `24-i18n-namespaces.html` | JSON namespaces, deep keys, fallback, lazy loading | ✅ Yes |

## Troubleshooting

### "Failed to resolve import" error
- Make sure Vite dev server is running (`npm run dev`)
- Don't open HTML files directly - use the Vite server URL

### "jsx is not defined" error
- Make sure you're accessing through Vite server, not opening file directly
- Check that `npm run dev` is running

### Module not found errors
- Run `npm install` to ensure dependencies are installed
- Restart the Vite server after installing

## Development Tips

- **Hot Module Replacement**: Vite automatically reloads when you edit JSX files
- **Console Logs**: Open browser DevTools to see reactive updates and effects
- **Edit Examples**: Edit the `.jsx` files in `apps/examples/` to experiment

