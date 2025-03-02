from django import forms
from .models import Note, Directory


class NoteForm(forms.ModelForm):
    class Meta:
        model = Note
        fields = ["title", "type", "directory"]

    title = forms.CharField(
        max_length=255,
        required=True,
        widget=forms.TextInput(attrs={"class": "form-control"}),
    )

    type = forms.ChoiceField(
        choices=Note.NOTE_TYPE_CHOICES,
        widget=forms.Select(attrs={"class": "form-control"}),
    )

    directory = forms.ModelChoiceField(
        queryset=Directory.objects.all(),
        required=False,  # Make sure this is optional
        widget=forms.Select(attrs={"class": "form-control"}),
    )
