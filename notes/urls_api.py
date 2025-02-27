from django.urls import path

from . import views

app_name = "notes_api"

urlpatterns = [
    path(
        "note/<int:note_id>/",
        views.notes_detail_ajax,
        name="note_detail",
    ),
]
