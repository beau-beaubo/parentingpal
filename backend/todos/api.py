from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from user.permissions import IsParentRole

from .models import TodoItem
from .serializers import TodoItemSerializer

from homework.models import HomeworkStatus
from homework.serializers import HomeworkTodoSerializer
from school.models import ParentStudent


class ParentTodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoItemSerializer
    permission_classes = [IsParentRole]

    def get_queryset(self):
        return TodoItem.objects.filter(parent_user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(parent_user=self.request.user)


class ParentTodoCombined(APIView):
    """Returns both manual todos and computed homework todos.

    Manual todos come from TodoItem.
    Homework todos are HomeworkStatus rows where status=assigned for the parent's linked students.
    """

    permission_classes = [IsParentRole]

    def get(self, request):
        manual_qs = TodoItem.objects.filter(parent_user=request.user).order_by("-created_at")

        student_ids = ParentStudent.objects.filter(parent=request.user).values_list("student_id", flat=True)
        homework_qs = (
            HomeworkStatus.objects.filter(student_id__in=student_ids, status=HomeworkStatus.Status.ASSIGNED)
            .select_related("student", "homework", "homework__school_class")
            .order_by("homework__due_date", "student__full_name")
        )

        return Response(
            {
                "manual": TodoItemSerializer(manual_qs, many=True).data,
                "homework": HomeworkTodoSerializer(homework_qs, many=True).data,
            }
        )
