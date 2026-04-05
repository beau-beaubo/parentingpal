from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	model = User
	list_display = ("email", "role", "is_active", "is_staff", "is_superuser")
	list_filter = ("role", "is_active", "is_staff", "is_superuser")
	ordering = ("email",)
	search_fields = ("email", "full_name")

	fieldsets = (
		(None, {"fields": ("email", "password")}),
		("Profile", {"fields": ("full_name", "role")}),
		("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
		("Important dates", {"fields": ("last_login",)}),
	)

	add_fieldsets = (
		(
			None,
			{
				"classes": ("wide",),
				"fields": ("email", "full_name", "role", "password1", "password2", "is_active", "is_staff"),
			},
		),
	)
