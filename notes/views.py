# notes/views.py
import json
from urllib.parse import urlencode

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.urls import reverse
from django.http import HttpResponse, QueryDict
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.utils.text import slugify
from notes.forms import NoteForm, RenameNoteForm
from .models import Note, Directory

LOCAL_NOTE_NAME = "local~note"


@login_required
def rename_note(request, note_id):
    note = get_object_or_404(Note, pk=note_id, user=request.user)

    if request.method == "POST":
        form = RenameNoteForm(request.POST, instance=note)

        if form.is_valid():
            note = form.save(commit=False)
            note.slug = slugify(note.title)
            note.save()
            messages.success(request, "Note has been renamed successfully.")
            return redirect(note.get_absolute_url())
    else:
        form = RenameNoteForm(instance=note)

    return render(request, "notes/rename_note.html", {"form": form, "note": note})


@login_required
def add_note(request):
    user = request.user
    directory_id = request.GET.get("directory")
    directory = None

    if directory_id == "all":
        directory_id = None
    if directory_id:
        directory = get_object_or_404(Directory, id=directory_id, user=user)

    if request.method == "POST":
        form = NoteForm(request.POST)
        if form.is_valid():
            note = form.save(commit=False)
            note.user = user
            note.save()

            query_dictionary = {}
            if note.directory:
                query_dictionary["directory"] = note.directory.id
            query_dictionary["note"] = note.id
            query_string = urlencode(query_dictionary)
            request.session["selected_note_id"] = note.id

            response = HttpResponse("<p up-main> </p>")
            response["X-Up-Events"] = json.dumps({type: "note:created", id: "bar"})
            return response

        # Return 400 Bad Request when form is invalid
        response = render(request, "notes/add_note.html", {"form": form})
        response.status_code = 400
        return response

    else:
        form = NoteForm(initial={"directory": directory})  # Pre-fill directory

    return render(request, "notes/add_note.html", {"form": form})


def note_list(request):
    """
    Display a list of notes for the logged-in user.
    """
    user = request.user
    if request.method == "POST":
        action = request.POST.get("action")
        if action == "create_note":
            note_title = request.POST.get("note_title", "").strip()
            note_type = request.POST.get("note_type", "").strip()
            note_directory_id = request.POST.get("note_directory_id", "").strip()
            if note_title:
                Note.objects.create(
                    title=note_title,
                    user=user,
                    directory_id=note_directory_id,
                    note_type=note_type,
                )

            query_dictionary = QueryDict("", mutable=True)
            if note_directory_id:
                query_dictionary.update({"directory": note_directory_id})
            url = "{base_url}?{querystring}".format(
                base_url=reverse("notes:note_list"),
                querystring=query_dictionary.urlencode(),
            )
            return redirect(url)

        if action == "rename_note":
            note_id = request.POST.get("note_id")
            new_title = request.POST.get("new_title", "").strip()
            if note_id and new_title:
                note = get_object_or_404(
                    Note, pk=note_id, user=user
                )  # Ensure user owns the note
                note.title = new_title
                note.save()

        elif action == "delete_note":
            note_id = request.POST.get("note_id")
            if note_id:
                note = get_object_or_404(
                    Note, pk=note_id, user=user
                )  # Ensure user owns the note
                note.delete()
            return redirect("notes:note_list")

    directory_id = request.GET.get("directory")

    note_filter_options = None
    if directory_id == "all":
        note_filter_options = "all"
    elif directory_id == "":
        note_filter_options = "not-assigned"

    directory_id = (
        int(directory_id) if directory_id and directory_id.isdigit() else None
    )

    directories = Directory.objects.filter(user=user).order_by(
        "index", "title"
    )  # Filter by user

    selected_note_id = request.GET.get("note")
    if selected_note_id:
        request.session["selected_note_id"] = selected_note_id
    else:
        selected_note_id = request.session.get("selected_note_id")
        if (
            selected_note_id and selected_note_id != LOCAL_NOTE_NAME
        ):  # Ensure it's not None
            if not Note.objects.filter(
                pk=selected_note_id
            ).exists():  # Check if the note exists safely
                request.session.pop("selected_note_id", None)
    if note_filter_options == "all":
        notes = Note.objects.filter(user=user).order_by("directory", "index", "title")
        directory_id = "all"
    else:
        notes = Note.objects.filter(user=user, directory_id=directory_id).order_by(
            "directory", "index", "title"
        )
    # Filter notes by user and directory

    selected_note = None
    if selected_note_id and (selected_note_id != LOCAL_NOTE_NAME):
        selected_note = get_object_or_404(Note, pk=selected_note_id, user=user)
    elif selected_note_id == LOCAL_NOTE_NAME:
        selected_note = {"title": LOCAL_NOTE_NAME, "content": ""}
    prepared_directories_list = [
        ("-- Not Assigned --", ""),
        ("-- All Notes --", "all"),
    ]
    prepared_directories_list.extend(list(directories.values_list("title", "id")))
    directories_json = json.dumps(prepared_directories_list)

    context = {
        "directory_list": directories,
        "directory_list_json": directories_json,
        "note_filter_options": note_filter_options,
        "selected_directory": directory_id,
        "notes": notes,
        "selected_note": selected_note,
        "selected_note_compatible_id": selected_note_id,
    }
    return render(request, "notes/note_list.html", context)


# TODO: check csrf safety
def notes_detail_ajax(request, id):
    """
    AJAX endpoint to update a note's content.
    """
    if request.method == "POST":
        json_data = json.loads(request.body)

        new_content = json_data["content"]

        note = get_object_or_404(
            Note, pk=id, user=request.user
        )  # Ensure user owns the note
        note.content = new_content
        note.save()
        return JsonResponse({"status": "ok", "result": {"note_id": id}})

    elif request.method == "GET":
        note = get_object_or_404(
            Note, pk=id, user=request.user
        )  # Ensure user owns the note
        return JsonResponse(
            {
                "status": "ok",
                "result": {"note_content": note.content, "note_title": note.title},
            }
        )

    return JsonResponse(
        {"status": "error", "message": "Only POST and GET allowed"}, status=400
    )


@require_POST
def ajax_update_note_order(request):
    """
    AJAX view to update a note's order (index) and directory.
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse(
            {"status": "error", "message": "Invalid JSON payload."}, status=400
        )

    note_id = data.get("note_id")
    new_index = data.get("new_index")
    new_directory = data.get("new_directory")

    if note_id is None or new_index is None:
        return JsonResponse(
            {"status": "error", "message": "Missing note_id or new_index."}, status=400
        )

    # Validate note ownership
    note = get_object_or_404(
        Note, pk=note_id, user=request.user
    )  # Ensure user owns the note

    # Validate directory ownership
    if new_directory not in [None, "0", 0]:
        directory = get_object_or_404(
            Directory, pk=new_directory, user=request.user
        )  # Ensure user owns the directory
        note.directory = directory
    else:
        note.directory = None

    note.index = int(new_index)
    note.save()

    return JsonResponse({"status": "ok", "note_id": note_id})


def note_detail(request, id):
    """
    Display a single note detail.
    Ensures users can only access their own notes.
    """
    if id == LOCAL_NOTE_NAME:
        note = {"title": LOCAL_NOTE_NAME, "content": ""}
    else:
        # Ensure the note belongs to the logged-in user
        note = get_object_or_404(Note, id=id, user=request.user)

    return render(
        request,
        "notes/note_detail.html",
        {
            "note": note,
            "selected_note": note,
            "selected_note_compatible_id": id,
        },
    )


from django.http import (
    HttpResponseBadRequest,
    JsonResponse,
    QueryDict,
)
from django.shortcuts import render, redirect, get_object_or_404

from .models import Directory, Note


def directory_list(request):
    """
    Display a list of directories owned by the logged-in user.
    """
    user = request.user

    if request.method == "POST":
        action = request.POST.get("action")

        # CREATE directory
        if action == "create":
            dir_title = request.POST.get("directory_title", "").strip()
            if dir_title:
                Directory.objects.create(title=dir_title, user=user)  # Assign to user
            return redirect("notes:directory_list")

        # RENAME directory
        elif action == "rename":
            directory_id = request.POST.get("directory_id")
            new_title = request.POST.get("new_title", "").strip()
            if directory_id and new_title:
                directory = get_object_or_404(
                    Directory, pk=directory_id, user=user
                )  # Ensure user owns directory
                directory.title = new_title
                directory.save()
            return redirect("notes:directory_list")

        # DELETE directory
        elif action == "delete":
            directory_id = request.POST.get("directory_id")
            if directory_id:
                directory = get_object_or_404(
                    Directory, pk=directory_id, user=user
                )  # Ensure user owns directory
                directory.delete()
            return redirect("notes:directory_list")

        return HttpResponseBadRequest("Invalid action.")

    # Retrieve only the user's directories
    directories = list(Directory.objects.filter(user=user).order_by("index", "title"))

    # Check if there are any unassigned notes (belonging to the user)
    notes_without_dir = Note.objects.filter(user=user, directory__isnull=True).order_by(
        "index", "title"
    )
    has_unassigned = notes_without_dir.exists()

    # Create "Not specified" directory for unassigned notes
    if has_unassigned:
        not_specified_dir = Directory(id=0, title="Not specified")
        directories.insert(0, not_specified_dir)

    # Build directory list with notes
    dir_with_notes = []
    for d in directories:
        if d.id == 0:
            dir_with_notes.append((d, notes_without_dir))
        else:
            dir_with_notes.append(
                (d, d.notes.filter(user=user).order_by("index", "title"))
            )

    context = {
        "directories": directories,
        "directories_with_notes": dir_with_notes,
    }
    return render(request, "notes/directory_list.html", context)
