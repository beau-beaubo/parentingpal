from django.conf import settings
from django.db import models

from school.models import SchoolClass


class Announcement(models.Model):
	school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="announcements")
	title = models.CharField(max_length=255)
	message = models.TextField()
	event_date = models.DateField(blank=True, null=True)
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="announcements_created")
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return self.title
