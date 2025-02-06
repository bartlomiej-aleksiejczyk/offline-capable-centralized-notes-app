from django.apps import AppConfig


class FailedloginsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'failedlogins'

    # noinspection PyUnresolvedReferences
    def ready(self):
        from failedlogins import signals
