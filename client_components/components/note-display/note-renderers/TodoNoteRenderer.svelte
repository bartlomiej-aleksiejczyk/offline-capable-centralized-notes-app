<script>
  import { noteStoreService } from "../services/noteStoreService.svelte.js";
  import { selectedNote } from "../noteStore.svelte.js";

  const { saveNoteContent } = noteStoreService();

  let debounceTimer = null;

  function debounceSave() {
    selectedNote.isSaving = true;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveNoteContent, 1000);
  }

  function parseTodos(content) {
    return content.split("\n").map((line) => {
      const isChecked = line.startsWith("[x]");
      return { text: line.replace(/^\[.\] /, ""), done: isChecked };
    });
  }

  function serializeTodos(todos) {
    return todos
      .map((todo) => `[${todo.done ? "x" : " "}] ${todo.text}`)
      .join("\n");
  }

  let todos = $state(parseTodos(selectedNote.content));
  $inspect(todos);

  function toggleTodo(index) {
    selectedNote.content = serializeTodos(todos);
    debounceSave();
  }

  function addTodo() {
    todos.push({ text: "", done: false });
    selectedNote.content = serializeTodos(todos);
    debounceSave();
  }

  function updateText(index, event) {
    selectedNote.content = serializeTodos(todos);
    debounceSave();
  }

  function handleKeydown(index, event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTodo();
    }
  }
</script>

<div class="todo-list">
  {#each todos as todo, index}
    <div class="todo-item">
      <input
        type="checkbox"
        bind:checked={todo.done}
        onchange={() => toggleTodo(index)}
      />
      <input
        type="text"
        class="todo-text"
        bind:value={todo.text}
        oninput={(e) => updateText(index, e)}
        onkeydown={(e) => handleKeydown(index, e)}
        placeholder="New task..."
      />
    </div>
  {/each}
  <button class="add-todo" onclick={addTodo}>+ Add Task</button>
</div>

<style>
  .todo-list {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background: var(--color-main-text-area);
  }

  .todo-item {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .todo-text {
    flex: 1;
    border: none;
    padding: 0.5rem;
    background: transparent;
    color: var(--color-main-text);
    outline: none;
    font-size: 1rem;
  }

  .todo-text:focus {
    outline: 1px solid var(--color-accent);
  }

  .add-todo {
    margin-top: 0.5rem;
    padding: 0.5rem;

    border: none;
    cursor: pointer;
  }

  .add-todo:hover {
    background: var(--color-accent-hover);
  }
</style>
