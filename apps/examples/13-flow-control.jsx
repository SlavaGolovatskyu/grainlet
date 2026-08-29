import {
  createSignal,
  render,
  Show,
  For,
  Switch,
  Match,
  Suspense,
  createResource,
} from 'grainlet';

let nextTodoId = 4;

function Page(props) {
  return (
    <div class="page-card">
      <h3>{props.page}</h3>
      <p>Branch content for tab “{props.page}”.</p>
    </div>
  );
}

function TodoItem(props) {
  const todo = props.todo;
  return (
    <li class="todo">
      <span>{todo.text}</span>
      <button type="button" onclick={() => props.onRemove(todo.id)}>
        ×
      </button>
    </li>
  );
}

function AsyncGreeting(props) {
  const [message] = createResource(
    () => props.name,
    async (name) => {
      await new Promise((r) => setTimeout(r, 600));
      return `Hello, ${name}!`;
    }
  );

  return <p class="greeting">{message()}</p>;
}

function FlowDemo() {
  const [tab, setTab] = createSignal(0);
  const [loggedIn, setLoggedIn] = createSignal(false);
  const [todos, setTodos] = createSignal([
    { id: 1, text: 'Write Show' },
    { id: 2, text: 'Write For' },
    { id: 3, text: 'Write Switch' },
  ]);
  const [draft, setDraft] = createSignal('');

  const addTodo = () => {
    const text = draft().trim();
    if (!text) return;
    setTodos((list) => [...list, { id: nextTodoId++, text }]);
    setDraft('');
  };

  const removeTodo = (id) => {
    setTodos((list) => list.filter((t) => t.id !== id));
  };

  return (
    <div class="flow-demo">
      <h1>Flow control</h1>

      <section>
        <h2>Show</h2>
        <button type="button" onclick={() => setLoggedIn((v) => !v)}>
          {loggedIn() ? 'Sign out' : 'Sign in'}
        </button>
        <Show when={loggedIn()} fallback={<p class="muted">Please sign in.</p>}>
          <p class="ok">Welcome back.</p>
        </Show>
      </section>

      <section>
        <h2>Switch / Match + Suspense</h2>
        <div class="tabs">
          <button type="button" class={tab() === 0 ? 'active' : ''} onclick={() => setTab(0)}>
            Uno
          </button>
          <button type="button" class={tab() === 1 ? 'active' : ''} onclick={() => setTab(1)}>
            Dos
          </button>
          <button type="button" class={tab() === 2 ? 'active' : ''} onclick={() => setTab(2)}>
            Tres
          </button>
        </div>
        <Suspense fallback={<div class="loader">Loading...</div>}>
          <Switch>
            <Match when={tab() === 0}>
              <Page page="Uno" />
              <AsyncGreeting name="Uno" />
            </Match>
            <Match when={tab() === 1}>
              <Page page="Dos" />
              <AsyncGreeting name="Dos" />
            </Match>
            <Match when={tab() === 2}>
              <Page page="Tres" />
              <AsyncGreeting name="Tres" />
            </Match>
          </Switch>
        </Suspense>
      </section>

      <section>
        <h2>For</h2>
        <div class="row">
          <input
            value={draft}
            oninput={(e) => setDraft(e.target.value)}
            onkeypress={(e) => {
              if (e.key === 'Enter') addTodo();
            }}
            placeholder="New todo"
          />
          <button type="button" onclick={addTodo}>
            Add
          </button>
        </div>
        <ul>
          <For each={todos()} fallback={<li class="muted">No todos</li>}>
            {(todo) => <TodoItem todo={todo} onRemove={removeTodo} />}
          </For>
        </ul>
      </section>
    </div>
  );
}

render(FlowDemo, document.getElementById('app'));
