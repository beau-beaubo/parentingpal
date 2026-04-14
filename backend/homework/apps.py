from django.apps import AppConfig


class HomeworkConfig(AppConfig):
    name = "homework"

    def ready(self) -> None:
        # Ensure model signals are registered.
        from . import signals  # noqa: F401
