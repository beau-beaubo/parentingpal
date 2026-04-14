from rest_framework import serializers

from school.models import ParentStudent, SchoolClass, Student
from user.models import User, UserRole


class AdminTeacherRefSerializer(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        return User.objects.filter(role=UserRole.TEACHER)


class SchoolClassSerializer(serializers.ModelSerializer):
    teacher = AdminTeacherRefSerializer()

    class Meta:
        model = SchoolClass
        fields = ("id", "name", "teacher")


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ("id", "full_name", "school_class")

    def create(self, validated_data):
        student = super().create(validated_data)
        self._ensure_homework_statuses_for_student(student)
        return student

    def update(self, instance, validated_data):
        old_class_id = instance.school_class_id
        student = super().update(instance, validated_data)
        if student.school_class_id != old_class_id:
            self._ensure_homework_statuses_for_student(student)
        return student

    def _ensure_homework_statuses_for_student(self, student: Student) -> None:
        # When a student is added to (or moved into) a class, ensure they have
        # an ASSIGNED HomeworkStatus for every existing homework in that class.
        from homework.models import Homework, HomeworkStatus

        homework_ids = list(Homework.objects.filter(school_class=student.school_class).values_list("id", flat=True))
        if not homework_ids:
            return

        existing_homework_ids = set(
            HomeworkStatus.objects.filter(student=student, homework_id__in=homework_ids).values_list("homework_id", flat=True)
        )

        to_create = [
            HomeworkStatus(homework_id=hw_id, student=student, status=HomeworkStatus.Status.ASSIGNED)
            for hw_id in homework_ids
            if hw_id not in existing_homework_ids
        ]
        if to_create:
            HomeworkStatus.objects.bulk_create(to_create)


class ParentStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentStudent
        fields = ("id", "parent", "student")

    def validate_parent(self, value: User):
        if value.role != UserRole.PARENT:
            raise serializers.ValidationError("parent must have role=parent")
        return value
