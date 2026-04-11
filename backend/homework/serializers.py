from django.db import transaction
from rest_framework import serializers

from school.models import SchoolClass, Student

from .models import Homework, HomeworkStatus


class HomeworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Homework
        fields = ("id", "school_class", "title", "description", "due_date", "created_by", "created_at")
        read_only_fields = ("id", "created_by", "created_at")


class HomeworkStatusSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = HomeworkStatus
        fields = ("id", "homework", "student", "student_name", "status", "updated_at")
        read_only_fields = ("id", "updated_at")


class TeacherHomeworkCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Homework
        fields = ("id", "school_class", "title", "description", "due_date")
        read_only_fields = ("id",)

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        homework = Homework.objects.create(created_by=request.user, **validated_data)

        students = Student.objects.filter(school_class=homework.school_class).only("id")
        HomeworkStatus.objects.bulk_create(
            [HomeworkStatus(homework=homework, student=student, status=HomeworkStatus.Status.ASSIGNED) for student in students]
        )
        return homework


class ParentHomeworkStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeworkStatus
        fields = ("status",)

    def validate_status(self, value: str) -> str:
        if value != HomeworkStatus.Status.SUBMITTED:
            raise serializers.ValidationError("Parent can only set status=submitted")
        return value


class TeacherHomeworkStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeworkStatus
        fields = ("status",)

    def validate_status(self, value: str) -> str:
        if value != HomeworkStatus.Status.CHECKED:
            raise serializers.ValidationError("Teacher can only set status=checked")
        return value
