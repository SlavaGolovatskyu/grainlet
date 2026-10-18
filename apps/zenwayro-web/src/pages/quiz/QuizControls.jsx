import { Show } from 'grainlet';

function read(value) {
  let current = value;
  let depth = 0;
  while (typeof current === 'function' && depth < 8) {
    current = current();
    depth += 1;
  }
  return current;
}

const BUTTON_BASE =
  'inline-flex items-center justify-center font-medium border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-sm rounded-lg';

export const PRIMARY_BUTTON_CLASS = `${BUTTON_BASE} bg-accent hover:bg-accent-hover text-accent-foreground border-transparent shadow-sm`;

export const GHOST_BUTTON_CLASS = `${BUTTON_BASE} bg-transparent hover:bg-surface-muted text-text-secondary border-transparent`;

const TAG_BASE =
  'inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium border transition-colors';

const TAG_SELECTED = `${TAG_BASE} bg-indigo-600 text-white border-indigo-600`;

const TAG_IDLE = `${TAG_BASE} bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700`;

const IMAGE_BASE = 'relative overflow-hidden rounded-xl border-2 transition-all';

const IMAGE_SELECTED = `${IMAGE_BASE} border-indigo-600 ring-2 ring-indigo-300 scale-[1.02]`;

const IMAGE_IDLE = `${IMAGE_BASE} border-gray-200 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500`;

export function Tag(props) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={() => (read(props.selected) ? TAG_SELECTED : TAG_IDLE)}
    >
      {props.label}
    </button>
  );
}

export function RangeSlider(props) {
  return (
    <div class="w-full">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {() => `${read(props.value)}${read(props.valueSuffix) ?? ''}`}
        </span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={() => read(props.value)}
        onInput={(event) => props.onChange(Number(event.target.value))}
        class="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-indigo-600"
      />
      <div class="flex justify-between mt-1">
        <span class="text-xs text-gray-400">
          {props.min}
          {props.valueSuffix}
        </span>
        <span class="text-xs text-gray-400">
          {props.max}
          {props.valueSuffix}
        </span>
      </div>
    </div>
  );
}

export function ImageOption(props) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={() => (read(props.selected) ? IMAGE_SELECTED : IMAGE_IDLE)}
    >
      <img src={props.src} alt={() => String(read(props.label) ?? '')} class="w-full h-32 object-cover" />
      <div class="p-2 text-center">
        <span
          class={() =>
            read(props.selected)
              ? 'text-sm font-medium text-indigo-600 dark:text-indigo-400'
              : 'text-sm font-medium text-gray-700 dark:text-gray-300'
          }
        >
          {props.label}
        </span>
      </div>
      <Show when={() => read(props.selected)}>
        <div class="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </Show>
    </button>
  );
}
