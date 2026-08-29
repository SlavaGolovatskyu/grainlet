import { createSignal, createEffect, render, Show } from 'grainlet';

export function Timer() {
  const [seconds, setSeconds] = createSignal(0);
  const [isRunning, setIsRunning] = createSignal(false);

  createEffect(() => {
    console.log('isRunning', isRunning());
    if (!isRunning()) return;

    const interval = setInterval(() => {
      console.log('Incrementing seconds');
      setSeconds(s => {
        console.log('Incrementing seconds', s);
        return s + 1;
      });
    }, 1000);

    console.log('Interval set', interval);

    return () => {
      console.log('Clearing interval');
      clearInterval(interval);
    };
  });

  const start = () => {
    console.log('Start clicked');
    setIsRunning(true);
  };
  const pause = () => setIsRunning(false);
  const reset = () => {
    console.log('Reset clicked');
    setSeconds(0);
    setIsRunning(false);
  };

  return (
    <div>
      <div class="timer-display">{seconds()}s</div>
      <div style="text-align: center;">
        <Show when={isRunning()}>
          <button class="pause-btn" onclick={pause}>Pause</button>
        </Show>
        <Show when={!isRunning()}>
          <button class="start-btn" onclick={start}>Start</button>
        </Show>
        <button class="reset-btn" onclick={reset}>Reset</button>
      </div>
      <p style="text-align: center; color: #666; margin-top: 20px;">
        Status: {isRunning() ? 'Running' : 'Paused'}
      </p>
    </div>
  );
}

render(Timer, document.getElementById('app'));
