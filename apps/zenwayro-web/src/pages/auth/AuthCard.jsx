import { Show } from 'grainlet';

function read(value) {
  return typeof value === 'function' ? value() : value;
}

const inputClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm';

const submitClass =
  'inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50';

export function AuthCard(props) {
  return (
    <div class="flex min-h-full items-center justify-center px-4 py-16">
      <section class="w-full max-w-sm rounded-lg border border-border bg-card text-card-foreground shadow-lg">
        <header class="flex flex-col space-y-1 p-6 text-center">
          <h1 class="text-2xl font-bold leading-none tracking-tight">{props.title}</h1>
          <Show when={props.description}>
            {(description) => (
              <p class="text-sm text-muted-foreground">{description}</p>
            )}
          </Show>
        </header>
        <div class="space-y-4 p-6 pt-0">{props.children}</div>
      </section>
    </div>
  );
}

export function AuthField(props) {
  return (
    <label class="block space-y-1.5">
      <span class="text-sm font-medium">{read(props.label)}</span>
      <input
        class={inputClass}
        name={read(props.name)}
        type={read(props.type) || 'text'}
        autocomplete={read(props.autocomplete)}
        placeholder={read(props.placeholder)}
        value={read(props.value)}
        onInput={props.onInput}
        onBlur={props.onBlur}
      />
      <Show when={read(props.error)}>
        {(message) => <p class="text-sm text-red-600 dark:text-red-400">{message}</p>}
      </Show>
    </label>
  );
}

export function AuthSubmitButton(props) {
  return (
    <button type="submit" class={submitClass} disabled={read(props.disabled)}>
      {props.children}
    </button>
  );
}
