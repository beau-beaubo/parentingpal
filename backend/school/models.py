from django.conf import settings
from django.db import models


class SchoolClass(models.Model):
	name = models.CharField(max_length=200)
	teacher = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.PROTECT,
		related_name="classes_taught",
	)

	def __str__(self) -> str:
		return self.name


class Student(models.Model):
	full_name = models.CharField(max_length=255)
	school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="students")

	def __str__(self) -> str:
		return self.full_name


class ParentStudent(models.Model):
	parent = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="parent_links",
	)
	student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="parent_links")

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=["parent", "student"], name="unique_parent_student"),
		]

	def __str__(self) -> str:
		return f"{self.parent_id}->{self.student_id}"
