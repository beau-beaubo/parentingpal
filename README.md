# Parenting Pal

Parenting Pal is a web app that helps teachers and parents track homework and school announcements in one place.

This repository currently contains the **Django backend** (auth + core APIs for classes/students, homework tracking, announcements, and parent todos) and a minimal **HTML/CSS/JS frontend** served by Django.

## Tech stack

- Backend: Django, Django REST Framework (DRF)
- Auth: JSON Web Tokens (JWT) via `djangorestframework-simplejwt`
- Database: SQLite by default (local), optional PostgreSQL via `DATABASE_URL`
- Frontend: Django Templates + vanilla JavaScript + TailwindCSS (CDN)

## Roles & permissions

- **Admin**
	- Creates teacher/admin accounts via Django admin.
	- Manages classes, students, and parent↔student links.
- **Teacher**
	- Sees only their classes.
	- Creates homework and announcements for their class.
	- Marks homework statuses as checked after parents submit.
- **Parent**
	- Self-registers (public registration).
	- Links to one or more children during registration.
	- Marks homework as submitted for each child and manages personal to-dos.

## Architecture (high level)

- Django apps:
	- `user`: custom email-based user model, JWT auth endpoints, registration
	- `school`: classes, students, parent↔student links
	- `homework`: homework + per-student `HomeworkStatus` lifecycle
	- `announcements`: class announcements + broadcast announcements
	- `todos`: parent manual to-dos
- Frontend pages are served under `/app/...` and call the JSON API under `/api/...` using JWT stored in `localStorage`.

## Key URLs

Frontend pages (served by Django):

- Login: `GET /app/login/`
- Register (Parent): `GET /app/register/`
- Parent dashboard: `GET /app/parent/`
- Teacher dashboard: `GET /app/teacher/`
- Admin dashboard: `GET /app/admin/`

API (selected endpoints):

- Auth
	- `POST /api/auth/token/` (login → JWT)
	- `POST /api/auth/register/` (public parent registration → JWT)
	- `GET /api/auth/me/` (current user)
- Public registration helpers
	- `GET /api/public/classes/`
	- `GET /api/public/students/?class_id=...`
- Teacher
	- `GET /api/teacher/classes/`
	- `POST /api/teacher/classes/<class_id>/homework/`
	- `POST /api/teacher/classes/<class_id>/announcements/`
	- `POST /api/teacher/announcements/broadcast/`
	- `PATCH /api/teacher/homework-status/<status_id>/checked/`
- Parent
	- `GET /api/parent/homework-todos/grouped/`
	- `PATCH /api/parent/homework-status/<status_id>/submitted/`
	- `GET/POST/PATCH/DELETE /api/parent/todos/...`
	- `GET /api/parent/announcements/`

## Screenshots (add your own)

Add screenshots here for your submission rubric:

- Login page (`/app/login/`)
- Register page with class filter + student selection (`/app/register/`)
- Parent dashboard (`/app/parent/`)
- Teacher dashboard (`/app/teacher/`)
- Admin dashboard (`/app/admin/`)

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


6. Run the server
	```bash
	python3 backend/manage.py runserver
	```

## Frontend pages (served by Django)

After starting the server:
- Login: `GET /app/login/`
- Register (Parent): `GET /app/register/`
- Parent dashboard: `GET /app/parent/`
- Teacher dashboard: `GET /app/teacher/`
- Admin dashboard: `GET /app/admin/`

Static assets are served from `GET /static/frontend/...`.

## Notes

- Teacher self-registration is intentionally not available in this MVP; teachers are created by an admin.
- For registration simplicity, the “select child(ren)” step uses public read-only endpoints for classes/students.
