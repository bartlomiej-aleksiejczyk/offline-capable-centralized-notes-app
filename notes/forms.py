from django import forms
from django.core.exceptions import ValidationError
import re
from .models import Note, Directory

LOCAL_NOTE_NAME = "local~note"


class NoteForm(forms.ModelForm):
    class Meta:
        model = Note
        fields = ["title", "type", "directory"]

    title = forms.CharField(
        max_length=250,
        required=True,
        widget=forms.TextInput(attrs={"class": "form-element"}),
    )

    type = forms.ChoiceField(
        choices=Note.NOTE_TYPE_CHOICES,
        widget=forms.Select(attrs={"class": "form-element"}),
    )

    directory = forms.ModelChoiceField(
        queryset=Directory.objects.all(),
        required=False,
        widget=forms.Select(attrs={"class": "form-element"}),
    )

    def clean_title(self):
        title = self.cleaned_data.get("title")

        if not re.match(r"^[A-Za-z\s\-_]+$", title):
            raise ValidationError(
                "Title can only contain letters, dashes, underscores, and spaces."
            )

        if title.lower() == LOCAL_NOTE_NAME:
            raise ValidationError(f"Title cannot be '{LOCAL_NOTE_NAME}'.")

        qs = Note.objects.filter(title=title)
        print(qs)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("Note title must be unique.")

        return title


class RenameNoteForm(forms.ModelForm):
    class Meta:
        model = Note
        fields = ["title"]
        # You can set a max_length on the widget if desired:
        widgets = {
            "title": forms.TextInput(attrs={"class": "form-element"}),
        }

    def clean_title(self):
        title = self.cleaned_data.get("title")

        # Ensure title only contains letters, dashes, underscores, and spaces.
        if not re.match(r"^[A-Za-z\s\-_]+$", title):
            raise ValidationError(
                "Title can only contain letters, dashes, underscores, and spaces."
            )

        # Reject the specific disallowed title.
        if title.lower() == LOCAL_NOTE_NAME:
            raise ValidationError(f"Title cannot be '{LOCAL_NOTE_NAME}'.")

        # Enforce uniqueness (excluding the current note instance).
        qs = Note.objects.filter(title=title)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("Note title must be unique.")

        # Enforce maximum length of 250 characters.
        if len(title) > 250:
            raise ValidationError("Title must be 250 characters or less.")

        return title
