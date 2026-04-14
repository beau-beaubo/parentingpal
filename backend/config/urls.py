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
from django.views.generic import TemplateView


PARENT_NAV_ITEMS = [
    {"key": "home", "label": "Home", "href": "/app/parent/"},
    {"key": "homework", "label": "Homework", "href": "/app/parent/homework/"},
    {"key": "announcements", "label": "Announcements", "href": "/app/parent/announcements/"},
    {"key": "todos", "label": "To‑Dos", "href": "/app/parent/todos/"},
]

TEACHER_NAV_ITEMS = [
    {"key": "home", "label": "Home", "href": "/app/teacher/"},
    {"key": "homework", "label": "Homework", "href": "/app/teacher/homework/"},
    {"key": "announcements", "label": "Announcements", "href": "/app/teacher/announcements/"},
    {"key": "statuses", "label": "Homework Statuses", "href": "/app/teacher/statuses/"},
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('config.api_urls')),

    # Frontend
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

    # Admin helper
    path('app/admin/', TemplateView.as_view(template_name='frontend/admin.html'), name='app-admin'),
]
