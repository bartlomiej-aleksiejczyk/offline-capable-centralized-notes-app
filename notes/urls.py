from django.urls import path

from . import views

app_name = 'notes'

urlpatterns = [
    path('', views.note_list, name='note_list'),
    path('create/', views.note_create, name='note_create'),
    path('directories/', views.directory_list, name='directory_list'),
    path('<slug:slug>/', views.note_detail, name='note_detail'),
    path('update/<int:note_id>/', views.ajax_update_note, name='ajax_update_note'),

]
