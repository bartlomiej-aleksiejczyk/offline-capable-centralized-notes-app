# notes/views.py
from django.http import HttpResponseBadRequest
from django.shortcuts import render, get_object_or_404, redirect

from .models import Note, Directory


def note_list(request):
    """
    Display a list of notes, optionally filtered by ?directory=<id>.
    Also handle creation of new directories via POST.
    """
    if request.method == 'POST':
        # We only expect 'create_directory' action from the JS prompt
        action = request.POST.get('action')
        if action == 'create_note':
            print('dupa')
            note_title = request.POST.get('note_title', '').strip()
            if note_title:
                # Create the new Directory
                Note.objects.create(title=note_title)
            # After creating directory (or if empty), redirect to GET
            return redirect('notes:note_list')

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


def directory_list(request):
    """
    Display a list of all directories and their notes (on the right).
    Allows creation, renaming, and deletion of directories using prompt/confirm.
    """
    if request.method == 'POST':
        action = request.POST.get('action')

        # CREATE a new directory
        if action == 'create':
            dir_title = request.POST.get('directory_title', '').strip()
            if dir_title:
                Directory.objects.create(title=dir_title)
            return redirect('notes:directory_list')

        # RENAME an existing directory
        elif action == 'rename':
            directory_id = request.POST.get('directory_id')
            new_title = request.POST.get('new_title', '').strip()
            if directory_id and new_title:
                directory = get_object_or_404(Directory, pk=directory_id)
                directory.title = new_title
                directory.save()
            return redirect('notes:directory_list')

        # DELETE an existing directory
        elif action == 'delete':
            directory_id = request.POST.get('directory_id')
            if directory_id:
                directory = get_object_or_404(Directory, pk=directory_id)
                directory.delete()
            return redirect('notes:directory_list')

        # If some unknown action, just return a 400 or redirect
        return HttpResponseBadRequest("Invalid action.")

    # GET request: just display the directories and their notes
    directories = Directory.objects.all().order_by('index', 'title')
    # If you want to get notes under each directory, you can do so in the template
    # or gather them here. For instance:
    dir_with_notes = []
    for d in directories:
        dir_with_notes.append((d, d.notes.order_by('index', 'title')))

    context = {
        'directories': directories,  # for the sidebar
        'directories_with_notes': dir_with_notes,  # for right content area
    }
    return render(request, 'notes/directory_list.html', context)
