from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Homework
from .services import ensure_homework_statuses


@receiver(post_save, sender=Homework, dispatch_uid="homework_create_statuses")
def _create_statuses_for_new_homework(sender, instance: Homework, created: bool, **kwargs) -> None:
    # Backfill missing statuses on create AND on admin edits.
    # This keeps data consistent even if homework was created before signals existed.
    ensure_homework_statuses(instance)
