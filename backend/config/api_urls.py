from django.urls import include, path
from rest_framework.routers import DefaultRouter

from school.api import AdminClassViewSet, AdminParentStudentViewSet, AdminStudentViewSet
from todos.api import ParentTodoCombined, ParentTodoViewSet
from user.api import AdminUserViewSet

from announcements.api import (
    ParentAnnouncementList,
    TeacherAnnouncementBroadcastCreate,
    TeacherClassAnnouncementListCreate,
)
from homework.api import (
    ParentHomeworkStatusList,
    ParentHomeworkStatusSubmit,
    ParentHomeworkTodoList,
    ParentHomeworkTodoGroupedList,
    TeacherClassHomeworkListCreate,
    TeacherHomeworkStatusList,
    TeacherHomeworkStatusMarkChecked,
)

router = DefaultRouter()

# Admin
router.register(r"admin/users", AdminUserViewSet, basename="admin-users")
router.register(r"admin/classes", AdminClassViewSet, basename="admin-classes")
router.register(r"admin/students", AdminStudentViewSet, basename="admin-students")
router.register(r"admin/parent-students", AdminParentStudentViewSet, basename="admin-parent-students")

# Parent
router.register(r"parent/todos", ParentTodoViewSet, basename="parent-todos")

urlpatterns = [
    # Auth
    path("", include("user.urls")),

    # Router endpoints
    path("", include(router.urls)),

    # Teacher
    path(
        "teacher/classes/<int:class_id>/homework/",
        TeacherClassHomeworkListCreate.as_view(),
        name="teacher-class-homework",
    ),
    path(
        "teacher/classes/<int:class_id>/announcements/",
        TeacherClassAnnouncementListCreate.as_view(),
        name="teacher-class-announcements",
    ),
    path(
        "teacher/announcements/broadcast/",
        TeacherAnnouncementBroadcastCreate.as_view(),
        name="teacher-announcements-broadcast",
    ),
    path(
        "teacher/homework/<int:homework_id>/status/",
        TeacherHomeworkStatusList.as_view(),
        name="teacher-homework-status-list",
    ),
    path(
        "teacher/homework-status/<int:status_id>/checked/",
        TeacherHomeworkStatusMarkChecked.as_view(),
        name="teacher-homework-status-checked",
    ),

    # Parent
    path("parent/homework/", ParentHomeworkStatusList.as_view(), name="parent-homework"),
    path("parent/homework-todos/", ParentHomeworkTodoList.as_view(), name="parent-homework-todos"),
    path(
        "parent/homework-todos/grouped/",
        ParentHomeworkTodoGroupedList.as_view(),
        name="parent-homework-todos-grouped",
    ),
    path("parent/todos/combined/", ParentTodoCombined.as_view(), name="parent-todos-combined"),
    path(
        "parent/homework-status/<int:status_id>/submitted/",
        ParentHomeworkStatusSubmit.as_view(),
        name="parent-homework-status-submitted",
    ),
    path(
        "parent/announcements/",
        ParentAnnouncementList.as_view(),
        name="parent-announcements",
    ),
]
