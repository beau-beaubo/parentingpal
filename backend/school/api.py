from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from user.permissions import IsAdminRole
from user.permissions import IsParentRole
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

    def get_queryset(self):
        qs = super().get_queryset()
        class_id = self.request.query_params.get("class_id")
        if class_id:
            qs = qs.filter(school_class_id=class_id)
        return qs


class AdminParentStudentViewSet(viewsets.ModelViewSet):
    queryset = ParentStudent.objects.select_related("parent", "student", "student__school_class").all().order_by("id")
    serializer_class = ParentStudentSerializer
    permission_classes = [IsAdminRole]


class TeacherClassList(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request):
        qs = SchoolClass.objects.filter(teacher=request.user).order_by("name")
        return Response([{"id": c.id, "name": c.name} for c in qs])


class ParentLinkedStudentList(APIView):
    permission_classes = [IsParentRole]

    def get(self, request):
        links = (
            ParentStudent.objects.select_related("student", "student__school_class")
            .filter(parent=request.user)
            .order_by("student__full_name")
        )

        return Response(
            [
                {
                    "id": l.student_id,
                    "full_name": l.student.full_name,
                    "class_id": l.student.school_class_id,
                    "class_name": l.student.school_class.name,
                }
                for l in links
            ]
        )


class PublicClassList(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        qs = SchoolClass.objects.all().order_by("name")
        return Response([{"id": c.id, "name": c.name} for c in qs])


class PublicStudentList(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        class_id = request.query_params.get("class_id")
        qs = Student.objects.select_related("school_class").all().order_by("full_name")
        if class_id:
            qs = qs.filter(school_class_id=class_id)

        return Response(
            [
                {
                    "id": s.id,
                    "full_name": s.full_name,
                    "class_id": s.school_class_id,
                    "class_name": s.school_class.name,
                }
                for s in qs
            ]
        )
