from __future__ import annotations

import datetime
import random

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

        # Keep the mock data stable-ish across runs.
        random.seed(42)

        User = get_user_model()

        admin_user = self._get_or_create_user(
            User,
            email="admin@parentingpal.local",
            full_name="Avery Morgan",
            role=UserRole.ADMIN,
            is_staff=True,
            is_superuser=True,
            password=password,
        )

        teachers = [
            self._get_or_create_user(
                User,
                email="olivia.chen@parentingpal.local",
                full_name="Ms. Olivia Chen",
                role=UserRole.TEACHER,
                is_staff=False,
                is_superuser=False,
                password=password,
            ),
            self._get_or_create_user(
                User,
                email="daniel.rivera@parentingpal.local",
                full_name="Mr. Daniel Rivera",
                role=UserRole.TEACHER,
                is_staff=False,
                is_superuser=False,
                password=password,
            ),
            self._get_or_create_user(
                User,
                email="priya.patel@parentingpal.local",
                full_name="Ms. Priya Patel",
                role=UserRole.TEACHER,
                is_staff=False,
                is_superuser=False,
                password=password,
            ),
            self._get_or_create_user(
                User,
                email="marcus.johnson@parentingpal.local",
                full_name="Mr. Marcus Johnson",
                role=UserRole.TEACHER,
                is_staff=False,
                is_superuser=False,
                password=password,
            ),
        ]

        classes = [
            self._get_or_create_class("Maple 1A", teachers[0]),
            self._get_or_create_class("Oak 1B", teachers[1]),
            self._get_or_create_class("Cedar 2A", teachers[2]),
            self._get_or_create_class("Pine 2B", teachers[3]),
        ]

        # 5 students per class.
        student_name_pool = [
            "Amelia Harris",
            "Noah Thompson",
            "Sophia Nguyen",
            "Liam Garcia",
            "Mia Robinson",
            "Ethan Martinez",
            "Isabella Lee",
            "Lucas Walker",
            "Ava Young",
            "Oliver King",
            "Charlotte Scott",
            "Elijah Green",
            "Harper Baker",
            "James Adams",
            "Evelyn Nelson",
            "Benjamin Carter",
            "Abigail Mitchell",
            "Henry Perez",
            "Emily Turner",
            "Alexander Collins",
            "Ella Edwards",
            "Sebastian Stewart",
            "Scarlett Sanchez",
            "Jack Morris",
        ]

        students_by_class: dict[int, list[Student]] = {}
        idx = 0
        for c in classes:
            students_by_class[c.id] = []
            for _ in range(5):
                full_name = student_name_pool[idx % len(student_name_pool)]
                idx += 1
                students_by_class[c.id].append(self._get_or_create_student(full_name, c))

        all_students: list[Student] = [s for group in students_by_class.values() for s in group]

        # Create a handful of parents and link them to students.
        parent_specs = [
            ("taylor.bennett@parentingpal.local", "Taylor Bennett"),
            ("casey.wright@parentingpal.local", "Casey Wright"),
            ("jamie.cooper@parentingpal.local", "Jamie Cooper"),
            ("morgan.hughes@parentingpal.local", "Morgan Hughes"),
            ("riley.ward@parentingpal.local", "Riley Ward"),
            ("alex.parker@parentingpal.local", "Alex Parker"),
            ("sam.brooks@parentingpal.local", "Sam Brooks"),
            ("jordan.price@parentingpal.local", "Jordan Price"),
            ("cameron.gray@parentingpal.local", "Cameron Gray"),
            ("logan.ross@parentingpal.local", "Logan Ross"),
        ]

        parents = [
            self._get_or_create_user(
                User,
                email=email,
                full_name=full_name,
                role=UserRole.PARENT,
                is_staff=False,
                is_superuser=False,
                password=password,
            )
            for (email, full_name) in parent_specs
        ]

        # Link each parent to 1 student, and a few to 2 students.
        random.shuffle(all_students)
        for i, parent in enumerate(parents):
            primary_student = all_students[i % len(all_students)]
            ParentStudent.objects.get_or_create(parent=parent, student=primary_student)

        for i in range(0, min(6, len(parents))):
            sibling_student = all_students[(i + 7) % len(all_students)]
            ParentStudent.objects.get_or_create(parent=parents[i], student=sibling_student)

        today = datetime.date.today()

        homework_specs = [
            (
                "Spelling practice",
                "Practice spelling words 1–12. Write each word twice.",
                2,
            ),
            (
                "Math worksheet",
                "Complete the addition/subtraction worksheet (front + back).",
                4,
            ),
            (
                "Reading log",
                "Read for 15 minutes and write 2 sentences about what you read.",
                1,
            ),
        ]

        all_homeworks: list[Homework] = []
        for class_idx, c in enumerate(classes):
            teacher = teachers[class_idx]
            for j, (title, description, due_in_days) in enumerate(homework_specs):
                hw = self._get_or_create_homework(
                    school_class=c,
                    created_by=teacher,
                    title=f"{title.title()} ({c.name})" if j == 2 else title.title(),
                    description=description,
                    due_date=today + datetime.timedelta(days=due_in_days + class_idx),
                )
                all_homeworks.append(hw)
                self._ensure_statuses_for_homework(hw)

        # Make the data feel real: progress some statuses across homeworks.
        for hw in all_homeworks:
            students_for_class = list(Student.objects.filter(school_class=hw.school_class).order_by("id"))
            if not students_for_class:
                continue
            if len(students_for_class) >= 2:
                self._set_status(hw, students_for_class[0], HomeworkStatus.Status.SUBMITTED)
                self._set_status(hw, students_for_class[1], HomeworkStatus.Status.CHECKED)
            if len(students_for_class) >= 4 and random.random() < 0.6:
                self._set_status(hw, students_for_class[3], HomeworkStatus.Status.SUBMITTED)

        announcement_specs = [
            ("Reminder", "Please check your child’s folder for notes.", 3),
            ("Library day", "Bring your library books back this week.", 6),
        ]
        for class_idx, c in enumerate(classes):
            teacher = teachers[class_idx]
            for title, message, in_days in announcement_specs:
                Announcement.objects.get_or_create(
                    school_class=c,
                    title=f"{c.name}: {title}",
                    message=message,
                    event_date=today + datetime.timedelta(days=in_days + class_idx),
                    defaults={"created_by": teacher},
                )

        todo_texts = [
            "Check backpack",
            "Sign homework",
            "Pack lunch",
            "Reply to teacher message",
        ]
        for parent in parents:
            for text in todo_texts[:3]:
                self._ensure_todo(parent, text)

        self.stdout.write(self.style.SUCCESS("Mock data seeded."))
        self.stdout.write(f"\nLogins (password: {password}):")
        self.stdout.write(f"- admin:   {admin_user.email}")
        for t in teachers:
            self.stdout.write(f"- teacher: {t.email}")
        for p in parents[:4]:
            self.stdout.write(f"- parent:  {p.email}")

        self.stdout.write("\nCounts:")
        self.stdout.write(f"- classes:  {SchoolClass.objects.count()}")
        self.stdout.write(f"- students: {Student.objects.count()}")
        self.stdout.write(f"- links:    {ParentStudent.objects.count()}")
        self.stdout.write(f"- homework: {Homework.objects.count()}")
        self.stdout.write(f"- announces:{Announcement.objects.count()}")
        self.stdout.write(f"- todos:    {TodoItem.objects.count()}")


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

    def _get_or_create_class(self, name: str, teacher) -> SchoolClass:
        existing = SchoolClass.objects.filter(name=name).order_by("id").first()
        if existing:
            if existing.teacher_id != teacher.id:
                existing.teacher = teacher
                existing.save(update_fields=["teacher"])
            return existing

        return SchoolClass.objects.create(name=name, teacher=teacher)

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
