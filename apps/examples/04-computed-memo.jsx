import { createSignal, createMemo, render, onMount } from 'grainlet';

export function Calculator() {
  const [price, setPrice] = createSignal(100);
  const [quantity, setQuantity] = createSignal(2);
  const [taxRate, setTaxRate] = createSignal(0.1);

  // Computed values - automatically update when dependencies change
  const subtotal = createMemo(() => price() * quantity());
  const tax = createMemo(() => subtotal() * taxRate());
  const total = createMemo(() => subtotal() + tax());

  // Count how many times total is recalculated (for demonstration)
  const [calculationCount, setCalculationCount] = createSignal(0);
  const totalWithCount = createMemo(() => {
    setCalculationCount((c) => c + 1);
    return total();
  });

  console.log('COMPONENT RE-RENDER OUTSIDE');

  onMount(() => {
    console.log('COMPONENT RE-RENDER');

    return () => console.log('component cleanup in onMount');
  });

  return (
    <div>
      <div>
        <label>Price: $</label>
        <input 
          type="number" 
          value={price()} 
          oninput={(e) => setPrice(parseFloat(e.target.value) || 0)}
        />
      </div>
      
      <div>
        <label>Quantity: </label>
        <input 
          type="number" 
          value={quantity()} 
          oninput={(e) => setQuantity(parseInt(e.target.value) || 0)}
        />
      </div>
      
      <div>
        <label>Tax Rate: </label>
        <input 
          type="number" 
          step="0.01"
          value={taxRate()} 
          oninput={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div class="result-box">
        <div>Subtotal</div>
        <div class="result-value">${subtotal().toFixed(2)}</div>
      </div>

      <div class="result-box">
        <div>Tax ({(taxRate() * 100).toFixed(1)}%)</div>
        <div class="result-value">${tax().toFixed(2)}</div>
      </div>

      <div class="result-box" style="background: #fff3cd; border-color: #ffc107;">
        <div>Total</div>
        <div class="result-value" style="color: #856404;">${totalWithCount().toFixed(2)}</div>
        <small style="color: #666;">Calculated {calculationCount()} time(s)</small>
      </div>
    </div>
  );
}

render(Calculator, document.getElementById('app'));
