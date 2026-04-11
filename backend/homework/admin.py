from django.contrib import admin

from .models import Homework, HomeworkStatus


admin.site.register(Homework)
admin.site.register(HomeworkStatus)
