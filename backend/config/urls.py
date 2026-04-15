"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from django.views.generic import TemplateView


PARENT_NAV_ITEMS = [
    {"key": "home", "label": "Home", "href": "/app/parent/"},
    {"key": "homework", "label": "Homework", "href": "/app/parent/homework/"},
    {"key": "announcements", "label": "Announcements", "href": "/app/parent/announcements/"},
    {"key": "todos", "label": "To‑Dos", "href": "/app/parent/todos/"},
    {"key": "profile", "label": "Profile", "href": "/app/parent/profile/"},
]

TEACHER_NAV_ITEMS = [
    {"key": "home", "label": "Home", "href": "/app/teacher/"},
    {"key": "homework", "label": "Homework", "href": "/app/teacher/homework/"},
    {"key": "announcements", "label": "Announcements", "href": "/app/teacher/announcements/"},
    {"key": "statuses", "label": "Homework Statuses", "href": "/app/teacher/statuses/"},
    {"key": "profile", "label": "Profile", "href": "/app/teacher/profile/"},
]

ADMIN_NAV_ITEMS = [
    {"key": "overview", "label": "Overview", "href": "/app/admin/"},
    {"key": "users", "label": "Users", "href": "/app/admin/users/"},
    {"key": "classes", "label": "Classes", "href": "/app/admin/classes/"},
    {"key": "students", "label": "Students", "href": "/app/admin/students/"},
    {"key": "links", "label": "Links", "href": "/app/admin/links/"},
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('config.api_urls')),

    # Frontend
    path('app/', RedirectView.as_view(url='/app/login/', permanent=False), name='app-root'),
    path('app/login/', TemplateView.as_view(template_name='frontend/login.html'), name='app-login'),
    path('app/register/', TemplateView.as_view(template_name='frontend/register.html'), name='app-register'),

    # Parent tabs
    path(
        'app/parent/',
        TemplateView.as_view(
            template_name='frontend/parent_home.html',
            extra_context={"nav_active": "home", "page_title": "Parent Dashboard", "data_page": "parent-home", "nav_items": PARENT_NAV_ITEMS},
        ),
        name='app-parent-home',
    ),
    path(
        'app/parent/homework/',
        TemplateView.as_view(
            template_name='frontend/parent_homework.html',
            extra_context={"nav_active": "homework", "page_title": "Parent • Homework", "data_page": "parent-homework", "nav_items": PARENT_NAV_ITEMS},
        ),
        name='app-parent-homework',
    ),
    path(
        'app/parent/announcements/',
        TemplateView.as_view(
            template_name='frontend/parent_announcements.html',
            extra_context={"nav_active": "announcements", "page_title": "Parent • Announcements", "data_page": "parent-announcements", "nav_items": PARENT_NAV_ITEMS},
        ),
        name='app-parent-announcements',
    ),
    path(
        'app/parent/todos/',
        TemplateView.as_view(
            template_name='frontend/parent_todos.html',
            extra_context={"nav_active": "todos", "page_title": "Parent • To‑Dos", "data_page": "parent-todos", "nav_items": PARENT_NAV_ITEMS},
        ),
        name='app-parent-todos',
    ),
    path(
        'app/parent/profile/',
        TemplateView.as_view(
            template_name='frontend/parent_profile.html',
            extra_context={"nav_active": "profile", "page_title": "Parent • Profile", "data_page": "parent-profile", "nav_items": PARENT_NAV_ITEMS},
        ),
        name='app-parent-profile',
    ),

    # Teacher tabs
    path(
        'app/teacher/',
        TemplateView.as_view(
            template_name='frontend/teacher_home.html',
            extra_context={"nav_active": "home", "page_title": "Teacher Dashboard", "data_page": "teacher-home", "nav_items": TEACHER_NAV_ITEMS},
        ),
        name='app-teacher-home',
    ),
    path(
        'app/teacher/homework/',
        TemplateView.as_view(
            template_name='frontend/teacher_homework.html',
            extra_context={"nav_active": "homework", "page_title": "Teacher • Homework", "data_page": "teacher-homework", "nav_items": TEACHER_NAV_ITEMS},
        ),
        name='app-teacher-homework',
    ),
    path(
        'app/teacher/announcements/',
        TemplateView.as_view(
            template_name='frontend/teacher_announcements.html',
            extra_context={"nav_active": "announcements", "page_title": "Teacher • Announcements", "data_page": "teacher-announcements", "nav_items": TEACHER_NAV_ITEMS},
        ),
        name='app-teacher-announcements',
    ),
    path(
        'app/teacher/statuses/',
        TemplateView.as_view(
            template_name='frontend/teacher_statuses.html',
            extra_context={"nav_active": "statuses", "page_title": "Teacher • Homework Statuses", "data_page": "teacher-statuses", "nav_items": TEACHER_NAV_ITEMS},
        ),
        name='app-teacher-statuses',
    ),
    path(
        'app/teacher/profile/',
        TemplateView.as_view(
            template_name='frontend/teacher_profile.html',
            extra_context={"nav_active": "profile", "page_title": "Teacher • Profile", "data_page": "teacher-profile", "nav_items": TEACHER_NAV_ITEMS},
        ),
        name='app-teacher-profile',
    ),

    # Admin helper
    path(
        'app/admin/',
        TemplateView.as_view(
            template_name='frontend/admin_dashboard.html',
            extra_context={"nav_active": "overview", "page_title": "Admin", "data_page": "admin", "nav_items": ADMIN_NAV_ITEMS},
        ),
        name='app-admin',
    ),
    path(
        'app/admin/users/',
        TemplateView.as_view(
            template_name='frontend/admin_users.html',
            extra_context={"nav_active": "users", "page_title": "Admin • Users", "data_page": "admin-users", "nav_items": ADMIN_NAV_ITEMS},
        ),
        name='app-admin-users',
    ),
    path(
        'app/admin/classes/',
        TemplateView.as_view(
            template_name='frontend/admin_classes.html',
            extra_context={"nav_active": "classes", "page_title": "Admin • Classes", "data_page": "admin-classes", "nav_items": ADMIN_NAV_ITEMS},
        ),
        name='app-admin-classes',
    ),
    path(
        'app/admin/students/',
        TemplateView.as_view(
            template_name='frontend/admin_students.html',
            extra_context={"nav_active": "students", "page_title": "Admin • Students", "data_page": "admin-students", "nav_items": ADMIN_NAV_ITEMS},
        ),
        name='app-admin-students',
    ),
    path(
        'app/admin/links/',
        TemplateView.as_view(
            template_name='frontend/admin_links.html',
            extra_context={"nav_active": "links", "page_title": "Admin • Links", "data_page": "admin-links", "nav_items": ADMIN_NAV_ITEMS},
        ),
        name='app-admin-links',
    ),
]
