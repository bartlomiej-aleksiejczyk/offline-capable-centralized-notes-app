from django.db import models
from django.utils.text import slugify
from django.urls import reverse

class Directory(models.Model):
    """
    A simple Directory model (not nested).
    """
    title = models.CharField(max_length=200, unique=True)
    index = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Note(models.Model):
    """
    A Note with an optional Directory parent.
    """
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    content = models.TextField()
    index = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    directory = models.ForeignKey(
        Directory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='notes'
    )

    def save(self, *args, **kwargs):
        # Automatically generate slug from title if not provided
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('notes:note_detail', kwargs={'slug': self.slug})
