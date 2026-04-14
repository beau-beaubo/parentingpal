# Parenting Pal

Parenting Pal is a web app that helps teachers and parents track homework and school announcements in one place.

This repository currently contains the **Django backend** (auth + core APIs for classes/students, homework tracking, announcements, and parent todos).

## Goals (What this app must do)
- Centralize homework assignments and announcements.
- Let parents clearly see **missing / not submitted** homework.
- Track homework status across a simple lifecycle: **Assigned → Submitted → Checked**.
- Provide a **parent To‑Do list** for reminders.
- Support **basic authentication** and **3 roles**: Teacher, Parent (Guardian), Admin.

## Roles & Permissions

### Teacher
- Create homework for a class (title, description, due date).
- Create announcements (quiz/test reminders).
- View homework tracking for students in their class.
- Update homework status to **Checked**.

### Parent (Guardian)
- View homework and announcements for **their own child only**.
- Mark homework as **Submitted**.
- View dashboard summary of status (not submitted / submitted / checked).
- Maintain a personal **To‑Do list** (reminder tool).

### Admin
- Full access.
- Create/update/delete users.
- Assign roles.
- Link parent(s) to child(ren).

## Scope

### Included
- Homework creation (teacher)
- Homework status tracking (Assigned / Submitted / Checked)
- Announcements (teacher)
- Parent dashboard
- Parent To‑Do list
- Basic user authentication

### Not included (do not build)
- File uploads / digital homework submission
- Real-time notifications (email/push)
- Mobile app
- Student direct login

## System Workflow
1. Teacher creates homework or announcements.
2. System stores data in the database.
3. Parent views homework + announcements + To‑Do list.
4. Parent marks homework **Submitted** when done at home.
5. Teacher reviews and marks homework **Checked**.

## Tech stack (current)
- Backend: Django + Django REST Framework
- Auth: Email + password with JWT (SimpleJWT)
- Database: SQLite by default (local), PostgreSQL supported via `DATABASE_URL`

## Repo structure (current)
```
parentingpal/
	backend/
		manage.py
		config/
		user/
		school/
		homework/
		announcements/
		todos/
		requirements.txt
		.env.example
```

## What to do first (Recommended MVP build order)
Build in this order to avoid rework:

1. **Data model + seed data**
	 - Users (roles), Classes, Students, Parent↔Student links
	 - Homework, HomeworkStatus per student, Announcements, TodoItems
2. **Authentication + authorization**
	 - Login
	 - Role-based access checks on every route
3. **Teacher: Homework + Announcements CRUD (minimum fields)**
	 - Create homework for a class
	 - Create announcement for a class
4. **Parent: dashboard + mark Submitted**
	 - List homework for child(ren)
	 - Mark a homework item Submitted
5. **Teacher: mark Checked**
	 - See per-student status for a homework assignment
	 - Mark Checked
6. **Parent To‑Do list**
	 - Add / complete / delete reminder items

## Status rules (keep it simple)
- On creation, each homework assignment produces **Assigned** status for every student in the class.
- Parent can only move a status from **Assigned → Submitted**.
- Teacher can only move a status from **Submitted → Checked** (optionally allow teacher to set Checked regardless, but be consistent).

## Suggested Data Model (SQLite/Postgres)
This is a minimal schema you can implement in any backend.

- `users`
	- `id`, `email` (unique), `password_hash`, `role` (`admin|teacher|parent`), `created_at`
- `classes`
	- `id`, `name`, `teacher_id`
- `students`
	- `id`, `full_name`, `class_id`
- `parent_students` (link table)
	- `parent_user_id`, `student_id`
- `homework`
	- `id`, `class_id`, `title`, `description`, `due_date`, `created_by_teacher_id`, `created_at`
- `homework_status`
	- `id`, `homework_id`, `student_id`, `status` (`assigned|submitted|checked`), `updated_at`
- `announcements`
	- `id`, `class_id`, `title`, `message`, `event_date` (optional), `created_at`
- `todo_items`
	- `id`, `parent_user_id`, `text`, `is_done`, `created_at`

## Suggested Pages (No extra UX beyond scope)
- Login
- Parent Dashboard
	- Homework list + status
	- Announcements list
	- To‑Do list
- Teacher Dashboard
	- Create homework
	- Create announcement
	- View homework status per student + mark Checked
- Admin Dashboard
	- Manage users
	- Link parent to student

## Implemented

### Auth API
- `POST /api/auth/token/` — get `{access, refresh}` using email/password
- `POST /api/auth/token/refresh/` — refresh an access token
- `GET /api/auth/me/` — returns the logged-in user (requires `Authorization: Bearer <access>`)

### Roles
Users have a `role` field:
- `admin`
- `teacher`
- `parent`

## API (implemented)

### Admin
- `GET/POST /api/admin/users/`
- `PATCH/DELETE /api/admin/users/:id/`
- `GET/POST /api/admin/classes/`
- `PATCH/DELETE /api/admin/classes/:id/`
- `GET/POST /api/admin/students/`
- `PATCH/DELETE /api/admin/students/:id/`
- `GET/POST /api/admin/parent-students/` (link)
- `PATCH/DELETE /api/admin/parent-students/:id/`

### Teacher
- `GET/POST /api/teacher/classes/:classId/homework/`
- `GET/POST /api/teacher/classes/:classId/announcements/`
- `POST /api/teacher/announcements/broadcast/` ("select all classes")
- `GET /api/teacher/homework/:homeworkId/status/`
- `PATCH /api/teacher/homework-status/:statusId/checked/` (set Checked)

### Parent
- `GET /api/parent/homework/`
- `GET /api/parent/homework-todos/` (computed "Homework To-Do" = assigned statuses)
- `PATCH /api/parent/homework-status/:statusId/submitted/` (set Submitted)
- `GET /api/parent/announcements/`
- `GET/POST /api/parent/todos/`
- `PATCH/DELETE /api/parent/todos/:id/`
- `GET /api/parent/todos/combined/` (returns `{manual: [...], homework: [...]}`)

## Backend setup (local)

From the repo root:

1. Create a virtual environment
	```bash
	python3 -m venv .venv
	source .venv/bin/activate
	```

2. Install dependencies
	```bash
	pip install -r backend/requirements.txt
	```

3. Create environment file
	```bash
	cp backend/.env.example backend/.env
	```
	- For PostgreSQL, set `DATABASE_URL` in `backend/.env`.

4. Migrate and create an admin user
	```bash
	python3 backend/manage.py migrate
	python3 backend/manage.py createsuperuser
	```

5. (Optional) Seed mock data
	```bash
	python3 backend/manage.py seed_mock_data
	```
	- This creates demo users/classes/students/homework/announcements/todos.
	- Creates these users:
		- `admin@parentingpal.local`
		- `teacher1@parentingpal.local`, `teacher2@parentingpal.local`
		- `parent1@parentingpal.local`, `parent2@parentingpal.local`
	- Default password for all seeded users is `password123`.
	- Override it: `python3 backend/manage.py seed_mock_data --password mypass123`

6. (Optional) Clear latest mock data
	- Recommended (deletes only the records created by the seeder):
		```bash
		python3 backend/manage.py clear_mock_data
		python3 backend/manage.py clear_mock_data --yes
		```
	- Nuclear option (wipes ALL tables):
		```bash
		python3 backend/manage.py flush
		```


7. Run the server
	```bash
	python3 backend/manage.py runserver
	```