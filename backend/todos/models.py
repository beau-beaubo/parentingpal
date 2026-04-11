from django.conf import settings
from django.db import models


class TodoItem(models.Model):
	parent_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="todo_items")
	text = models.CharField(max_length=500)
	is_done = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return self.text
