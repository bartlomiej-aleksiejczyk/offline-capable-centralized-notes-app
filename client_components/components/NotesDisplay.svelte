<svelte:options customElement="notes-display" />

<script>
  import { onMount } from "svelte";

  let {
    ajaxNoteEndpoint,
    selectedNoteId,
    selectedNoteTitle,
    selectedNoteContent = "",
    csrfToken = "",
  } = $props();
  console.log(selectedNoteContent);
  let debounceTimer = null;
  let documentHideTime = null;

  onMount(() => {
    if (selectedNoteTitle === "local~note") {
      loadDefaultNote();
    } else {
      loadNoteContent();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    setupInactivityTimer();
  });

  function loadDefaultNote() {
    selectedNoteContent = localStorage.getItem("localNote") || "";
  }

  function handleVisibilityChange() {
    if (!document.hidden) {
      loadNoteContent();
    }
  }

  function debounceSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveNoteContent, 1000);
  }

  function loadNoteContent() {
    if (!selectedNoteId) return;

    fetch(ajaxNoteEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status !== "ok") {
          console.error("Error fetching note:", data);
        } else {
          console.log("fetched note: ", data.result.note_content);

          selectedNoteTitle = data.result.note_title;
          selectedNoteContent = data.result.note_content;

          console.log("fetched note: ", data);
        }
      })
      .catch((err) => console.error("Ajax error:", err));
  }

  function saveNoteContent() {
    if (selectedNoteTitle === "local~note") {
      localStorage.setItem("localNote", selectedNoteContent);
    }

    if (!selectedNoteId) return;

    fetch(ajaxNoteEndpoint, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: selectedNoteContent }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status !== "ok") {
          console.error("Error updating note:", data);
        }
      })
      .catch((err) => console.error("Ajax error:", err));
  }

  let inactivityTimeout;

  function setupInactivityTimer() {
    resetInactivityTimer();
    ["mousemove", "keydown", "scroll", "click", "touchstart"].forEach(
      (event) => {
        document.addEventListener(event, resetInactivityTimer);
      }
    );
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
      location.reload();
    }, 60000);
  }
</script>

<div class="notes-display">
  {#if selectedNoteTitle && selectedNoteId}
    <div class="notes-display__header">
      <h3>{selectedNoteTitle}</h3>
    </div>
    <div class="notes-display__content">
      <textarea
        bind:value={selectedNoteContent}
        class="notes-display__textarea"
        oninput={debounceSave}
      ></textarea>
    </div>
  {:else}
    <div class="notes-display__no-content">
      <h3>Select a note to see details.</h3>
    </div>
  {/if}
</div>

<style>
  .notes-display {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    flex-grow: 1;
    align-self: stretch;
  }

  .notes-display__header {
    padding: 1.25rem 1rem 1.5rem;
    display: flex;
    justify-content: center;
    background-color: var(--color-main-text-area);
    color: var(--color-main-text);
    border: none;
  }

  .notes-display__textarea {
    padding-left: 3rem;
    overflow: auto;
    resize: none;
    white-space: pre;
    outline: none;
    background-color: var(--color-main-text-area);
    color: var(--color-main-text);
    border: none;
    margin: 0;
    justify-content: start;
    flex: 1;

    &:focus {
      outline-color: transparent;
    }
  }

  .notes-display__content {
    margin: 0;
    display: flex;
    flex-direction: column;
    justify-content: start;
    flex: 1;
    align-self: stretch;
  }

  .notes-display__no-content {
    justify-content: center;
    display: flex;
    align-items: center;
    flex: 1;
    align-self: stretch;
    text-align: center;
  }
</style>
