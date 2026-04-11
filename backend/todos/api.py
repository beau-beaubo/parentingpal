from rest_framework import viewsets

from user.permissions import IsParentRole

from .models import TodoItem
from .serializers import TodoItemSerializer


class ParentTodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoItemSerializer
    permission_classes = [IsParentRole]

    def get_queryset(self):
        return TodoItem.objects.filter(parent_user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(parent_user=self.request.user)
