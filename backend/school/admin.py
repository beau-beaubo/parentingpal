from django.contrib import admin

from .models import ParentStudent, SchoolClass, Student


admin.site.register(SchoolClass)
admin.site.register(Student)
admin.site.register(ParentStudent)
