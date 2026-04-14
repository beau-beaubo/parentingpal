from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Homework


def ensure_homework_statuses(homework: "Homework") -> int:
    """Ensure a HomeworkStatus row exists for every student in the homework's class.

    Returns the number of statuses created.

    This is intentionally safe to call multiple times.
    """

    # Local imports to avoid app-loading circular imports.
    from school.models import Student

    from .models import HomeworkStatus

    student_ids = list(
        Student.objects.filter(school_class_id=homework.school_class_id).values_list("id", flat=True)
    )
    if not student_ids:
        return 0

    existing_student_ids = set(
        HomeworkStatus.objects.filter(homework_id=homework.id, student_id__in=student_ids).values_list(
            "student_id", flat=True
        )
    )

    to_create = [
        HomeworkStatus(homework_id=homework.id, student_id=student_id, status=HomeworkStatus.Status.ASSIGNED)
        for student_id in student_ids
        if student_id not in existing_student_ids
    ]

    if not to_create:
        return 0

    # `ignore_conflicts` protects against races (and pre-existing rows).
    HomeworkStatus.objects.bulk_create(to_create, ignore_conflicts=True)
    return len(to_create)
