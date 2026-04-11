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


class ParentStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentStudent
        fields = ("id", "parent", "student")

    def validate_parent(self, value: User):
        if value.role != UserRole.PARENT:
            raise serializers.ValidationError("parent must have role=parent")
        return value
