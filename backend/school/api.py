from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from user.permissions import IsAdminRole
from user.permissions import IsTeacherRole

from .models import ParentStudent, SchoolClass, Student
from .serializers import ParentStudentSerializer, SchoolClassSerializer, StudentSerializer


class AdminClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all().order_by("id")
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAdminRole]


class AdminStudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related("school_class").all().order_by("id")
    serializer_class = StudentSerializer
    permission_classes = [IsAdminRole]


class AdminParentStudentViewSet(viewsets.ModelViewSet):
    queryset = ParentStudent.objects.select_related("parent", "student").all().order_by("id")
    serializer_class = ParentStudentSerializer
    permission_classes = [IsAdminRole]


class TeacherClassList(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request):
        qs = SchoolClass.objects.filter(teacher=request.user).order_by("name")
        return Response([{"id": c.id, "name": c.name} for c in qs])
