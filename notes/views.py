# notes/views.py

from django.shortcuts import render, get_object_or_404, redirect

from .models import Note, Directory


def note_list(request):
    """
    Display a list of notes, optionally filtered by directory (?directory=<id>).
    """
    directory_id = request.GET.get('directory')
    directories = Directory.objects.all().order_by('index', 'title')

    # Filter notes if 'directory' param is passed
    if directory_id:
        notes = Note.objects.filter(directory_id=directory_id).order_by('index', 'title')
    else:
        notes = Note.objects.all().order_by('directory', 'index', 'title')

    context = {
        'notes': notes,
        'directory_list': directories,
        'selected_directory': directory_id
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
