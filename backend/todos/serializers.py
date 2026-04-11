from rest_framework import serializers

from .models import TodoItem


class TodoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoItem
        fields = ("id", "text", "is_done", "created_at")
        read_only_fields = ("id", "created_at")
