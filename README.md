# Parenting Pal

Parenting Pal is a web app that helps teachers and parents track homework and school announcements in one place.

This repository currently contains the **Django backend** (auth + core APIs for classes/students, homework tracking, announcements, and parent todos) and a minimal **HTML/CSS/JS frontend** served by Django.

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
- Admin helper page: `GET /app/admin/`

Static assets are served from `GET /static/frontend/...`.
