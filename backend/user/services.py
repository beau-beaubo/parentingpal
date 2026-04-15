from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken

from school.models import ParentStudent, Student

from .models import User


class RegistrationError(Exception):
    pass


@dataclass(frozen=True)
class RegistrationResult:
    user: User
    access: str
    refresh: str


@transaction.atomic
def register_parent(
    *,
    email: str,
    password: str,
    full_name: str = "",
    student_ids: list[int] | None = None,
) -> RegistrationResult:
    if User.objects.filter(email__iexact=email).exists():
        raise RegistrationError("An account with this email already exists.")

    user = User.objects.create_user(email=email, password=password, full_name=full_name)

    if student_ids:
        unique_ids = sorted({int(sid) for sid in student_ids if sid})
        students = list(Student.objects.filter(id__in=unique_ids))
        found_ids = {s.id for s in students}
        missing = [sid for sid in unique_ids if sid not in found_ids]
        if missing:
            raise RegistrationError("Some selected students were not found.")

        ParentStudent.objects.bulk_create(
            [ParentStudent(parent=user, student=s) for s in students],
            ignore_conflicts=True,
        )

    refresh = RefreshToken.for_user(user)
    return RegistrationResult(user=user, access=str(refresh.access_token), refresh=str(refresh))
