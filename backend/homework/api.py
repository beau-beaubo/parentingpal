from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models import ParentStudent, SchoolClass
from user.permissions import IsParentRole, IsTeacherRole

from .models import Homework, HomeworkStatus
from .serializers import (
    HomeworkSerializer,
    HomeworkStatusSerializer,
    ParentHomeworkStatusUpdateSerializer,
    TeacherHomeworkCreateSerializer,
    TeacherHomeworkStatusUpdateSerializer,
)


class TeacherClassHomeworkListCreate(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request, class_id: int):
        school_class = get_object_or_404(SchoolClass, id=class_id, teacher=request.user)
        qs = Homework.objects.filter(school_class=school_class).order_by("-created_at")
        return Response(HomeworkSerializer(qs, many=True).data)

    def post(self, request, class_id: int):
        school_class = get_object_or_404(SchoolClass, id=class_id, teacher=request.user)
        serializer = TeacherHomeworkCreateSerializer(
            data={**request.data, "school_class": school_class.id},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        homework = serializer.save()
        return Response(HomeworkSerializer(homework).data, status=status.HTTP_201_CREATED)


class TeacherHomeworkStatusList(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request, homework_id: int):
        homework = get_object_or_404(
            Homework.objects.select_related("school_class"),
            id=homework_id,
            school_class__teacher=request.user,
        )
        qs = HomeworkStatus.objects.filter(homework=homework).select_related("student").order_by("student__full_name")
        return Response(HomeworkStatusSerializer(qs, many=True).data)


class TeacherHomeworkStatusMarkChecked(APIView):
    permission_classes = [IsTeacherRole]

    def patch(self, request, status_id: int):
        hw_status = get_object_or_404(
            HomeworkStatus.objects.select_related("homework__school_class"),
            id=status_id,
            homework__school_class__teacher=request.user,
        )
        if hw_status.status != HomeworkStatus.Status.SUBMITTED:
            return Response(
                {"detail": "Only submitted homework can be marked checked."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TeacherHomeworkStatusUpdateSerializer(hw_status, data={"status": HomeworkStatus.Status.CHECKED}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(HomeworkStatusSerializer(hw_status).data)


class ParentHomeworkStatusList(APIView):
    permission_classes = [IsParentRole]

    def get(self, request):
        student_ids = ParentStudent.objects.filter(parent=request.user).values_list("student_id", flat=True)
        qs = (
            HomeworkStatus.objects.filter(student_id__in=student_ids)
            .select_related("student", "homework", "homework__school_class")
            .order_by("homework__due_date")
        )
        return Response(HomeworkStatusSerializer(qs, many=True).data)


class ParentHomeworkStatusSubmit(APIView):
    permission_classes = [IsParentRole]

    def patch(self, request, status_id: int):
        hw_status = get_object_or_404(
            HomeworkStatus.objects.select_related("student"),
            id=status_id,
            student__parent_links__parent=request.user,
        )
        if hw_status.status != HomeworkStatus.Status.ASSIGNED:
            return Response(
                {"detail": "Only assigned homework can be submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ParentHomeworkStatusUpdateSerializer(hw_status, data={"status": HomeworkStatus.Status.SUBMITTED}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(HomeworkStatusSerializer(hw_status).data)
