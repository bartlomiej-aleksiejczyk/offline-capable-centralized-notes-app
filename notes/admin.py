from django.contrib import admin
from .models import Directory, Note


@admin.register(Directory)
class DirectoryAdmin(admin.ModelAdmin):
    list_display = ("title", "index", "created", "modified")


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("title", "directory", "index", "created", "modified")
