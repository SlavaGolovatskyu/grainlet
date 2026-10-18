import { Show } from 'grainlet';

export function QuestionCard(props) {
  return (
    <div class="w-full max-w-2xl mx-auto space-y-6">
      <div class="text-center space-y-2">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{props.question}</h2>
        <Show when={props.subtitle}>
          {(subtitle) => <p class="text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </Show>
      </div>
      <div>{props.children}</div>
    </div>
  );
}
