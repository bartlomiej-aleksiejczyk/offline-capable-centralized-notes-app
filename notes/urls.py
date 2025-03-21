from django.urls import path

from . import views

app_name = "notes"

urlpatterns = [
    path("", views.note_list, name="note_list"),
    path("add_note/", views.add_note, name="add_note"),
    path("<str:id>/rename_note/", views.rename_note, name="rename_note"),
    path("directories/", views.directory_list, name="directory_list"),
    path(
        "ajax_update_note_order/",
        views.ajax_update_note_order,
        name="ajax_update_note_order",
    ),
    path("<str:id>/", views.note_detail, name="note_detail"),
]
