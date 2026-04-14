from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models import ParentStudent, SchoolClass
from user.permissions import IsParentRole, IsTeacherRole

from .models import Announcement
from .serializers import AnnouncementBroadcastSerializer, AnnouncementSerializer


class TeacherClassAnnouncementListCreate(APIView):
    permission_classes = [IsTeacherRole]

    def get(self, request, class_id: int):
        school_class = get_object_or_404(SchoolClass, id=class_id, teacher=request.user)
        qs = Announcement.objects.filter(school_class=school_class).order_by("-created_at")
        return Response(AnnouncementSerializer(qs, many=True).data)

    def post(self, request, class_id: int):
        school_class = get_object_or_404(SchoolClass, id=class_id, teacher=request.user)
        serializer = AnnouncementSerializer(
            data={**request.data, "school_class": school_class.id},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(created_by=request.user)
        return Response(AnnouncementSerializer(announcement).data, status=status.HTTP_201_CREATED)


class ParentAnnouncementList(APIView):
    permission_classes = [IsParentRole]

    def get(self, request):
        student_ids = ParentStudent.objects.filter(parent=request.user).values_list("student_id", flat=True)
        class_ids = SchoolClass.objects.filter(students__id__in=student_ids).values_list("id", flat=True).distinct()
        qs = Announcement.objects.filter(school_class_id__in=class_ids).order_by("-created_at")
        return Response(AnnouncementSerializer(qs, many=True).data)


class TeacherAnnouncementBroadcastCreate(APIView):
    permission_classes = [IsTeacherRole]

    def post(self, request):
        serializer = AnnouncementBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        school_classes = list(SchoolClass.objects.filter(teacher=request.user).only("id"))
        if not school_classes:
            return Response(
                {"detail": "You do not have any classes to announce to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for school_class in school_classes:
            created.append(
                Announcement.objects.create(
                    school_class=school_class,
                    title=serializer.validated_data["title"],
                    message=serializer.validated_data["message"],
                    event_date=serializer.validated_data.get("event_date"),
                    created_by=request.user,
                )
            )

        return Response(AnnouncementSerializer(created, many=True).data, status=status.HTTP_201_CREATED)
