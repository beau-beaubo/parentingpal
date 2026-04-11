from django.conf import settings
from django.db import models

from school.models import SchoolClass, Student


class Homework(models.Model):
	school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="homework")
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	due_date = models.DateField()
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="homework_created")
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return self.title


class HomeworkStatus(models.Model):
	class Status(models.TextChoices):
		ASSIGNED = "assigned", "Assigned"
		SUBMITTED = "submitted", "Submitted"
		CHECKED = "checked", "Checked"

	homework = models.ForeignKey(Homework, on_delete=models.CASCADE, related_name="statuses")
	student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="homework_statuses")
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.ASSIGNED)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=["homework", "student"], name="unique_homework_per_student"),
		]

	def __str__(self) -> str:
		return f"{self.homework_id}:{self.student_id}:{self.status}"
