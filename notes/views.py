# notes/views.py
import json

from django.views.decorators.http import require_POST


def note_list(request):
    """
    Display a list of notes, optionally filtered by ?directory=<id>.
    Also handle creation of new directories via POST.
    If a note is specified via ?note=<id>, store that note id in the session.
    """
    if request.method == 'POST':
        # We only expect 'create_note', 'rename_note', and 'delete_note' actions from the JS prompt.
        action = request.POST.get('action')
        if action == 'create_note':
            note_title = request.POST.get('note_title', '').strip()
            if note_title:
                Note.objects.create(title=note_title)
            # After creating note (or if empty), redirect to GET.
            return redirect('notes:note_list')
        if action == 'rename_note':
            note_id = request.POST.get('note_id')
            new_title = request.POST.get('new_title', '').strip()
            if note_id and new_title:
                note = get_object_or_404(Note, pk=note_id)
                note.title = new_title
                note.save()
        elif action == 'delete_note':
            note_id = request.POST.get('note_id')
            if note_id:
                note = get_object_or_404(Note, pk=note_id)
                note.delete()
            return redirect('notes:note_list')

    # Handle the GET case: show directories + notes.
    directory_id = request.GET.get('directory')
    directories = Directory.objects.all().order_by('index', 'title')

    # Look for a note parameter in the query string.
    selected_note_id = request.GET.get('note')
    if selected_note_id:
        # Save the selected note id in the session.
        request.session['selected_note_id'] = selected_note_id
    else:
        # Otherwise, if there's a note id stored in session, use that.
        selected_note_id = request.session.get('selected_note_id')

    # Filter notes based on directory if provided.
    if directory_id:
        notes = Note.objects.filter(directory_id=directory_id).order_by('index', 'title')
    else:
        notes = Note.objects.all().order_by('directory', 'index', 'title')

    selected_note = None
    if selected_note_id:
        selected_note = get_object_or_404(Note, pk=selected_note_id)

    context = {
        'directory_list': directories,
        'selected_directory': directory_id,
        'notes': notes,
        'selected_note': selected_note,
    }
    return render(request, 'notes/note_list.html', context)


# TODO: check csrf safety
def ajax_update_note(request, note_id):
    """
    Receives an Ajax POST with 'content' to update the note's content.
    Returns JSON status.
    """
    if request.method == 'POST':
        new_content = request.POST.get('content', '')
        note = get_object_or_404(Note, pk=note_id)
        note.content = new_content
        note.save()
        return JsonResponse({'status': 'ok', 'note_id': note_id})
    return JsonResponse({'status': 'error', 'message': 'Only POST allowed'}, status=400)


@require_POST
def ajax_update_note_order(request):
    """
    AJAX view to update a note's order (index) and directory assignment.
    Expects a JSON payload with:
        - note_id: the primary key of the note,
        - new_index: the new index (position) as an integer,
        - new_directory: the new directory id (or "0" for no directory).
    Returns a JSON response indicating success or error.
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON payload.'}, status=400)

    note_id = data.get('note_id')
    new_index = data.get('new_index')
    new_directory = data.get('new_directory')

    if note_id is None or new_index is None:
        return JsonResponse({'status': 'error', 'message': 'Missing note_id or new_index.'}, status=400)

    # Ensure new_index is an integer
    try:
        new_index = int(new_index)
    except (ValueError, TypeError):
        return JsonResponse({'status': 'error', 'message': 'Invalid new_index value.'}, status=400)

    # Retrieve the note object
    note = get_object_or_404(Note, pk=note_id)

    # Update the note's directory assignment:
    # If new_directory is "0", 0, or None, set directory to None.
    if new_directory in [None, "0", 0]:
        note.directory = None
    else:
        directory = get_object_or_404(Directory, pk=new_directory)
        note.directory = directory

    # Update the note's index
    note.index = new_index
    note.save()

    return JsonResponse({'status': 'ok', 'note_id': note_id})


def note_detail(request, id):
    """
    Display a single note detail.
    """
    note = get_object_or_404(Note, id=id)
    return render(request, 'notes/note_detail.html', {'note': note, 'selected_note': note, })


from django.http import HttpResponseBadRequest, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404

from .models import Directory, Note


def directory_list(request):
    """
    Display a list of all directories and their notes (on the right).
    Allows creation, renaming, and deletion of directories using prompt/confirm,
    and includes a "Not specified" directory for notes with no directory.
    """
    if request.method == 'POST':
        action = request.POST.get('action')
        # CREATE
        if action == 'create':
            dir_title = request.POST.get('directory_title', '').strip()
            if dir_title:
                Directory.objects.create(title=dir_title)
            return redirect('notes:directory_list')

        # RENAME
        elif action == 'rename':
            directory_id = request.POST.get('directory_id')
            new_title = request.POST.get('new_title', '').strip()
            if directory_id and new_title:
                directory = get_object_or_404(Directory, pk=directory_id)
                directory.title = new_title
                directory.save()
            return redirect('notes:directory_list')

        # DELETE
        elif action == 'delete':
            directory_id = request.POST.get('directory_id')
            if directory_id:
                directory = get_object_or_404(Directory, pk=directory_id)
                directory.delete()
            return redirect('notes:directory_list')

        return HttpResponseBadRequest("Invalid action.")

    # Handle GET: list directories + notes
    directories = list(Directory.objects.all().order_by('index', 'title'))

    # Check if there are any notes without a directory
    notes_without_dir = Note.objects.filter(directory__isnull=True).order_by('index', 'title')
    has_unassigned = notes_without_dir.exists()

    # Create a "synthetic" directory object for "Not specified"
    # if there are unassigned notes.
    # We give it a special ID of 0 (or any sentinel value).
    if has_unassigned:
        not_specified_dir = Directory(
            id=0,
            title="Not specified"  # You can change this label to your liking
        )
        # Insert it at the top or anywhere you want
        directories.insert(0, not_specified_dir)

    # Build up the list of (directory, notes) for the right content area
    dir_with_notes = []
    for d in directories:
        if d.id == 0:
            # Our synthetic "Not specified" directory
            dir_with_notes.append((d, notes_without_dir))
        else:
            dir_with_notes.append((d, d.notes.order_by('index', 'title')))

    context = {
        'directories': directories,  # For the sidebar
        'directories_with_notes': dir_with_notes,  # For the right content area
    }
    return render(request, 'notes/directory_list.html', context)
