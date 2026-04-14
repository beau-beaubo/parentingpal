from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class RegistrationError(Exception):
    pass


@dataclass(frozen=True)
class RegistrationResult:
    user: User
    access: str
    refresh: str


@transaction.atomic
def register_parent(*, email: str, password: str, full_name: str = "") -> RegistrationResult:
    if User.objects.filter(email__iexact=email).exists():
        raise RegistrationError("An account with this email already exists.")

    user = User.objects.create_user(email=email, password=password, full_name=full_name)
    refresh = RefreshToken.for_user(user)
    return RegistrationResult(user=user, access=str(refresh.access_token), refresh=str(refresh))
