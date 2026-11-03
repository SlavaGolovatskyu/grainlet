import { createSignal, render, onMount } from 'grainlet';

export function BasicCounter(props) {
  const [count, setCount] = createSignal(props.initialCount || 0);

  console.log('COMPONENT RE-RENDER OUTSIDE');
  onMount(() => {
    console.log('COMPONENT RE-RENDER');

    return () => console.log('component cleanup in onMount');
  });

  return (
    <div>
      <div id="counter-display">{count()}</div>
      <div style="text-align: center;">
        <button onclick={() => { 
          console.log('Increment clicked, current count:', count()); 
          setCount(count() + 1); 
          console.log('After increment:', count()); 
        }}>
          Increment
        </button>
        <button onclick={() => { 
          console.log('Decrement clicked'); 
          setCount(count() - 1); 
        }}>
          Decrement
        </button>
        <button onclick={() => { 
          console.log('Reset clicked'); 
          setCount(0); 
        }}>
          Reset
        </button>
        <button onclick={() => { 
          console.log('Double clicked'); 
          setCount(c => c * 2); 
        }}>
          Double
        </button>
      </div>
    </div>
  );
}

// Auto-render
render(BasicCounter, document.getElementById('app'), { initialCount: 0 });
