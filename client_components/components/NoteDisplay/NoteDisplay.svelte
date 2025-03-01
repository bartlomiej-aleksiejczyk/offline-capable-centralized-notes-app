<svelte:options customElement="note-display" />

<script>
  import { onMount } from "svelte";
  import { setupInactivityTimer } from "./services/noteReloadServices";
  import { noteStoreService } from "./services/noteStoreService.svelte";
  import { selectedNote } from "./noteStore.svelte.js";
  import PlaintextNoteRenderer from "./note-renderers/PlaintextNoteRenderer.svelte";
  import UniversalRendererWrapper from "./note-renderers/UniversalRendererWrapper.svelte";

  let {
    ajaxNoteEndpoint,
    selectedNoteId,
    initialSelectedNoteTitle,
    initialSelectedNoteContent = "",
    csrfToken = "",
  } = $props();

  let { loadDefaultNote, loadNoteContent } = noteStoreService();

  window.addEventListener("beforeunload", function (event) {
    if (selectedNote.isSaving) event.preventDefault();
  });

  onMount(() => {
    selectedNote.title = initialSelectedNoteTitle;
    selectedNote.content = initialSelectedNoteContent;
    selectedNote.ajaxNoteEndpoint = ajaxNoteEndpoint;
    selectedNote.selectedNoteId = selectedNoteId;
    selectedNote.csrfToken = csrfToken;

    if (selectedNote.title === "local~note") {
      loadDefaultNote();
    } else {
      loadNoteContent();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    setupInactivityTimer(loadNoteContent);
  });

  function handleVisibilityChange() {
    if (!document.hidden) {
      loadNoteContent();
    }
  }
</script>

<UniversalRendererWrapper>
  <PlaintextNoteRenderer />
</UniversalRendererWrapper>
