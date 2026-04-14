from __future__ import annotations

import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from announcements.models import Announcement
from homework.models import Homework, HomeworkStatus
from todos.models import TodoItem
from user.models import UserRole

from ...models import ParentStudent, SchoolClass, Student


class Command(BaseCommand):
    help = "Seed the database with mock Parenting Pal data (users, classes, students, homework, announcements, todos)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default="password123",
            help="Password to set for all created mock users (default: password123)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password: str = options["password"]

        User = get_user_model()

        users = {
            "admin": self._get_or_create_user(
                User,
                email="admin@parentingpal.local",
                full_name="Admin User",
                role=UserRole.ADMIN,
                is_staff=True,
                is_superuser=True,
                password=password,
            ),
            "teacher1": self._get_or_create_user(
                User,
                email="teacher1@parentingpal.local",
                full_name="Ms. Teacher",
                role=UserRole.TEACHER,
                is_staff=False,
                is_superuser=False,
                password=password,
            ),
            "teacher2": self._get_or_create_user(
                User,
                email="teacher2@parentingpal.local",
                full_name="Mr. Teacher",
                role=UserRole.TEACHER,
                is_staff=False,
                is_superuser=False,
                password=password,
            ),
            "parent1": self._get_or_create_user(
                User,
                email="parent1@parentingpal.local",
                full_name="Pat Parent",
                role=UserRole.PARENT,
                is_staff=False,
                is_superuser=False,
                password=password,
            ),
            "parent2": self._get_or_create_user(
                User,
                email="parent2@parentingpal.local",
                full_name="Jordan Parent",
                role=UserRole.PARENT,
                is_staff=False,
                is_superuser=False,
                password=password,
            ),
        }

        class_a, _ = SchoolClass.objects.get_or_create(name="Class A", teacher=users["teacher1"])
        class_b, _ = SchoolClass.objects.get_or_create(name="Class B", teacher=users["teacher2"])

        students = {
            "a1": self._get_or_create_student("Ava Student", class_a),
            "a2": self._get_or_create_student("Noah Student", class_a),
            "b1": self._get_or_create_student("Mia Student", class_b),
            "b2": self._get_or_create_student("Liam Student", class_b),
        }

        ParentStudent.objects.get_or_create(parent=users["parent1"], student=students["a1"])
        ParentStudent.objects.get_or_create(parent=users["parent1"], student=students["b1"])
        ParentStudent.objects.get_or_create(parent=users["parent2"], student=students["a2"])
        ParentStudent.objects.get_or_create(parent=users["parent2"], student=students["b2"])

        today = datetime.date.today()

        hw_a1 = self._get_or_create_homework(
            school_class=class_a,
            created_by=users["teacher1"],
            title="Spelling Practice",
            description="Practice spelling words 1-10.",
            due_date=today + datetime.timedelta(days=2),
        )
        hw_a2 = self._get_or_create_homework(
            school_class=class_a,
            created_by=users["teacher1"],
            title="Math Worksheet",
            description="Complete worksheet page 3.",
            due_date=today + datetime.timedelta(days=4),
        )
        hw_b1 = self._get_or_create_homework(
            school_class=class_b,
            created_by=users["teacher2"],
            title="Reading Log",
            description="Read for 15 minutes and write 2 sentences.",
            due_date=today + datetime.timedelta(days=1),
        )

        self._ensure_statuses_for_homework(hw_a1)
        self._ensure_statuses_for_homework(hw_a2)
        self._ensure_statuses_for_homework(hw_b1)

        # Make the data feel real: progress a couple statuses.
        self._set_status(hw_a1, students["a1"], HomeworkStatus.Status.SUBMITTED)
        self._set_status(hw_a1, students["a2"], HomeworkStatus.Status.CHECKED)

        Announcement.objects.get_or_create(
            school_class=class_a,
            title="Quiz Friday",
            message="Quick spelling quiz on Friday.",
            event_date=today + datetime.timedelta(days=5),
            defaults={"created_by": users["teacher1"]},
        )
        Announcement.objects.get_or_create(
            school_class=class_b,
            title="Field Trip Reminder",
            message="Please return permission slips by Wednesday.",
            event_date=today + datetime.timedelta(days=3),
            defaults={"created_by": users["teacher2"]},
        )

        self._ensure_todo(users["parent1"], "Buy pencils")
        self._ensure_todo(users["parent1"], "Pack lunch")
        self._ensure_todo(users["parent2"], "Sign permission slip")

        self.stdout.write(self.style.SUCCESS("Mock data seeded."))
        self.stdout.write(f"\nLogins (password: {password}):")
        self.stdout.write(f"- admin:   {users['admin'].email}")
        self.stdout.write(f"- teacher: {users['teacher1'].email}")
        self.stdout.write(f"- teacher: {users['teacher2'].email}")
        self.stdout.write(f"- parent:  {users['parent1'].email}")
        self.stdout.write(f"- parent:  {users['parent2'].email}")

    def _get_or_create_user(
        self,
        User,
        *,
        email: str,
        full_name: str,
        role: str,
        is_staff: bool,
        is_superuser: bool,
        password: str,
    ):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": full_name,
                "role": role,
                "is_staff": is_staff,
                "is_superuser": is_superuser,
                "is_active": True,
            },
        )

        changed = False
        if created:
            changed = True
        if user.full_name != full_name:
            user.full_name = full_name
            changed = True
        if user.role != role:
            user.role = role
            changed = True
        if user.is_staff != is_staff:
            user.is_staff = is_staff
            changed = True
        if user.is_superuser != is_superuser:
            user.is_superuser = is_superuser
            changed = True
        if not user.is_active:
            user.is_active = True
            changed = True

        # Always enforce a known password for mock users.
        user.set_password(password)
        changed = True

        if changed:
            user.save(update_fields=["full_name", "role", "is_staff", "is_superuser", "is_active", "password"])
        return user

    def _get_or_create_student(self, full_name: str, school_class: SchoolClass) -> Student:
        student, _ = Student.objects.get_or_create(full_name=full_name, school_class=school_class)
        return student

    def _get_or_create_homework(
        self,
        *,
        school_class: SchoolClass,
        created_by,
        title: str,
        description: str,
        due_date: datetime.date,
    ) -> Homework:
        homework = (
            Homework.objects.filter(
                school_class=school_class,
                created_by=created_by,
                title=title,
                due_date=due_date,
            )
            .order_by("-id")
            .first()
        )
        if homework:
            if homework.description != description:
                homework.description = description
                homework.save(update_fields=["description"])
            return homework

        return Homework.objects.create(
            school_class=school_class,
            created_by=created_by,
            title=title,
            description=description,
            due_date=due_date,
        )

    def _ensure_statuses_for_homework(self, homework: Homework) -> None:
        students = list(Student.objects.filter(school_class=homework.school_class).only("id"))
        existing_student_ids = set(
            HomeworkStatus.objects.filter(homework=homework).values_list("student_id", flat=True)
        )

        to_create = [
            HomeworkStatus(homework=homework, student=student, status=HomeworkStatus.Status.ASSIGNED)
            for student in students
            if student.id not in existing_student_ids
        ]
        if to_create:
            HomeworkStatus.objects.bulk_create(to_create)

    def _set_status(self, homework: Homework, student: Student, status: str) -> None:
        hw_status, _ = HomeworkStatus.objects.get_or_create(
            homework=homework,
            student=student,
            defaults={"status": status},
        )
        if hw_status.status != status:
            hw_status.status = status
            hw_status.save(update_fields=["status", "updated_at"])

    def _ensure_todo(self, parent_user, text: str) -> None:
        if TodoItem.objects.filter(parent_user=parent_user, text=text).exists():
            return
        TodoItem.objects.create(parent_user=parent_user, text=text)
