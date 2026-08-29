import { createSignal, createEffect, onCleanup, render } from 'grainlet';

export function EffectsDemo() {
  const [name, setName] = createSignal('');
  const [count, setCount] = createSignal(0);
  const [logs, setLogs] = createSignal([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    // Functional updater avoids creating a dependency on logs when called from effects
    setLogs((prevLogs) => [...prevLogs, { message, type, timestamp }]);
  };

  // Runs when name() changes — does not re-run this component function
  createEffect(() => {
    const currentName = name();
    addLog(`Effect: Name changed to "${currentName}"`, 'effect');

    return () => {
      addLog(`Cleanup: Effect for "${currentName}" is cleaning up`, 'cleanup');
    };
  });

  createEffect(() => {
    if (count() > 0) {
      addLog(`Effect: Count is ${count()}, setting up interval`, 'effect');

      const interval = setInterval(() => {
        addLog(`Interval tick: count is ${count()}`, 'info');
      }, 2000);

      return () => {
        addLog(`Cleanup: Clearing interval for count ${count()}`, 'cleanup');
        clearInterval(interval);
      };
    }
  });

  onCleanup(() => {
    addLog('Component unmounting — all cleanups will run', 'cleanup');
  });

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div>
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          oninput={(e) => setName(e.target.value)}
          placeholder="Type a name..."
        />
        <p>
          Current name: <strong>{name() || '(empty)'}</strong>
        </p>
      </div>

      <div>
        <label>Count:</label>
        <input
          type="number"
          value={count}
          oninput={(e) => setCount(parseInt(e.target.value, 10) || 0)}
          placeholder="Enter a number"
        />
        <p>
          Current count: <strong>{count()}</strong>
        </p>
        <button onclick={() => setCount((c) => c + 1)}>Increment</button>
        <button onclick={() => setCount(0)}>Reset</button>
      </div>

      <div style="margin-top: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3>Effect Logs:</h3>
          <button class="clear-btn" onclick={clearLogs}>
            Clear Logs
          </button>
        </div>
        <div class="log-box">
          {logs().length === 0 ? (
            <p style="color: #999; text-align: center;">
              No logs yet. Change the name or count to see effects in action!
            </p>
          ) : (
            logs()
              .slice()
              .reverse()
              .map((log, index) => (
                <div key={index} class={`log-entry ${log.type}`}>
                  <strong>[{log.timestamp}]</strong> {log.message}
                </div>
              ))
          )}
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 10px;">
          <strong>Note:</strong> Name/count use fine-grained bindings so this component does
          not re-run when you type. The log list lives in a child that re-renders when{' '}
          <code>logs</code> changes. Cleanups run when an effect re-runs or the component
          unmounts.
        </p>
      </div>
    </div>
  );
}

render(EffectsDemo, document.getElementById('app'));
