# notes/views.py


def note_list(request):
    """
    Display a list of notes, optionally filtered by ?directory=<id>.
    Also handle creation of new directories via POST.
    """
    if request.method == 'POST':
        # We only expect 'create_directory' action from the JS prompt
        action = request.POST.get('action')
        if action == 'create_note':
            note_title = request.POST.get('note_title', '').strip()
            if note_title:
                # Create the new Directory
                Note.objects.create(title=note_title)
            # After creating directory (or if empty), redirect to GET
            return redirect('notes:note_list')
        if action == 'rename_note':
            note_id = request.POST.get('note_id')
            new_title = request.POST.get('new_title', '').strip()
            if note_id and new_title:
                note = get_object_or_404(Note, pk=note_id)
                note.title = new_title
                note.save()

    # Handle the GET case: show directories + notes
    directory_id = request.GET.get('directory')
    directories = Directory.objects.all().order_by('index', 'title')

    if directory_id:
        notes = Note.objects.filter(directory_id=directory_id).order_by('index', 'title')
    else:
        notes = Note.objects.all().order_by('directory', 'index', 'title')

    context = {
        'directory_list': directories,
        'selected_directory': directory_id,
        'notes': notes,
    }
    return render(request, 'notes/note_list.html', context)


def note_detail(request, slug):
    """
    Display a single note detail.
    """
    note = get_object_or_404(Note, slug=slug)
    return render(request, 'notes/note_detail.html', {'note': note})


def note_create(request):
    """
    Show a basic HTML form (GET); handle creation (POST).
    """
    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        slug = request.POST.get('slug', '').strip()
        content = request.POST.get('content', '')
        index = request.POST.get('index', '0')
        directory_id = request.POST.get('directory_id', '')

        # Attempt converting index to int
        try:
            index = int(index)
        except ValueError:
            index = 0

        directory = None
        if directory_id:
            # If a directory was chosen, fetch it
            directory = get_object_or_404(Directory, pk=directory_id)

        # If no slug is provided, it will be generated in .save()
        new_note = Note(
            title=title,
            slug=slug,
            content=content,
            index=index,
            directory=directory
        )
        new_note.save()  # Slug might be auto-generated

        return redirect('notes:note_detail', slug=new_note.slug)

    # GET case: show a form
    directories = Directory.objects.all().order_by('index', 'title')
    return render(request, 'notes/note_form.html', {'directories': directories})


from django.http import HttpResponseBadRequest
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
