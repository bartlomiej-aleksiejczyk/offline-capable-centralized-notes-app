export const selectedNote = $state({
  content: "",
  title: undefined,
  ajaxNoteEndpoint: undefined,
  selectedNoteId: undefined,
  csrfToken: undefined,
  isSaving: false,
});
