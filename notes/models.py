from django.conf import settings  # Import settings to use AUTH_USER_MODEL
from django.db import models
from django.urls import reverse


class Directory(models.Model):
    """
    A simple Directory model (not nested).
    """

    title = models.CharField(max_length=200, unique=True)
    index = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="directories"
    )  # Use settings.AUTH_USER_MODEL for the custom user model

    def __str__(self):
        return self.title


class Note(models.Model):
    """
    A Note with an optional Directory parent.
    """

    NOTE_TYPE_CHOICES = {
        "PLAINTEXT": "Plaintext note",
        "MARKDOWN": "Markdown note",
        "TODO": "Todo list",
    }

    title = models.CharField(max_length=255)
    content = models.TextField()
    index = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    type = models.CharField(
        max_length=255, choices=NOTE_TYPE_CHOICES, default="PLAINTEXT"
    )
    directory = models.ForeignKey(
        Directory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes"
    )

    def __str__(self):
        return self.title
