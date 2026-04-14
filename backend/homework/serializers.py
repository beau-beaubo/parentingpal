from django.db import transaction
from rest_framework import serializers

from school.models import SchoolClass

from .models import Homework, HomeworkStatus
from .services import ensure_homework_statuses


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

        # Create per-student statuses for this class (idempotent).
        ensure_homework_statuses(homework)
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


class HomeworkTodoSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id = serializers.IntegerField(source="student.id", read_only=True)

    homework_id = serializers.IntegerField(source="homework.id", read_only=True)
    homework_title = serializers.CharField(source="homework.title", read_only=True)
    homework_due_date = serializers.DateField(source="homework.due_date", read_only=True)

    class_id = serializers.IntegerField(source="homework.school_class.id", read_only=True)
    class_name = serializers.CharField(source="homework.school_class.name", read_only=True)

    class Meta:
        model = HomeworkStatus
        fields = (
            "id",
            "status",
            "updated_at",
            "student_id",
            "student_name",
            "homework_id",
            "homework_title",
            "homework_due_date",
            "class_id",
            "class_name",
        )
        read_only_fields = fields


class HomeworkTodoGroupedSerializer(serializers.Serializer):
    homework_id = serializers.IntegerField()
    homework_title = serializers.CharField()
    homework_due_date = serializers.DateField()
    class_id = serializers.IntegerField()
    class_name = serializers.CharField()

    items = HomeworkTodoSerializer(many=True)
