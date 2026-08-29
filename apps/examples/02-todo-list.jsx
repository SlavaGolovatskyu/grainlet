import { createSignal, render } from 'grainlet';

export function TodoList() {
  const [todos, setTodos] = createSignal([]);
  const [inputValue, setInputValue] = createSignal('');

  const addTodo = () => {
    const text = inputValue().trim();
    if (text) {
      setTodos([...todos(), {
        id: Date.now(),
        text,
        completed: false
      }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos().map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    console.log('Delete clicked for id:', id);
    setTodos(todos().filter(todo => todo.id !== id));
  };

  // Use event delegation for delete and toggle buttons
  const handleTodoClick = (e) => {
    const todoItem = e.target.closest('.todo-item');
    if (!todoItem) return;

    const todoId = parseInt(todoItem.getAttribute('data-todo-id'));

    if (e.target.classList.contains('delete-btn')) {
      deleteTodo(todoId);
    } else if (e.target.tagName === 'SPAN' && todoItem.contains(e.target)) {
      toggleTodo(todoId);
    }
  };

  return (
    <div>
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <input
          type="text"
          id="todo-input"
          value={inputValue()}
          oninput={(e) => setInputValue(e.target.value)}
          onkeypress={(e) => { if (e.key === 'Enter') addTodo(); }}
          placeholder="Add a new todo..."
        />
        <button onclick={addTodo}>Add Todo</button>
      </div>

      <div onclick={handleTodoClick}>
        <p>
          <strong>Total: {todos().length}</strong> |
          <strong>Completed: {todos().filter(t => t.completed).length}</strong> |
          <strong>Remaining: {todos().filter(t => !t.completed).length}</strong>
        </p>

        {todos().length === 0 ? (
          <p style="color: #999; text-align: center;">No todos yet. Add one above!</p>
        ) : (
          todos().map(todo => (
            <div
              key={todo.id}
              class={`todo-item ${todo.completed ? 'completed' : ''}`}
              data-todo-id={todo.id}
            >
              <span style="cursor: pointer; flex: 1;">
                {todo.text}
              </span>
              <button class="delete-btn" data-todo-id={todo.id}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

render(TodoList, document.getElementById('app'));
