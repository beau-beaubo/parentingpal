# Parenting Pal

## Project Description

Parenting Pal is a web-based application designed to support communication between teachers and parents by providing a structured way to manage homework and school announcements.

Teachers can assign homework and announcements, while parents can monitor their child's homework progress, identify missing assignments, and use a To-Do List as a reminder tool to support learning at home.

---

## System Architecture Overview

![System architecture overview](docs/screenshots/sys_arch.svg)

**High-level flow:**

1. Browser loads pages from Django under `/app/...`
2. Frontend JavaScript calls JSON APIs under `/api/...`
3. Authentication uses JWT (SimpleJWT). The frontend stores the access token in `localStorage` and sends `Authorization: Bearer <token>`.

**Core Django apps:**

| App | Responsibility |
|-----|----------------|
| `user` | Custom email-based User model, JWT auth, registration, role permissions |
| `school` | Classes, students, parent↔student links |
| `homework` | Homework assignments + per-student `HomeworkStatus` |
| `announcements` | Class announcements with broadcast support |
| `todos` | Parent manual to-dos |

**Data model overview:**

- `SchoolClass` → has one `teacher` (User with role `teacher`)
- `Student` → belongs to one `SchoolClass`
- `ParentStudent` → links parent users to student records (many-to-many)
- `Homework` → belongs to one class; each student has one `HomeworkStatus` per homework

**Class diagram:** [View on dbdiagram.io](https://dbdiagram.io/e/69df70578089629684a21209/69df70940f7c9ef2c0021652)

---

## User Roles & Permissions

### Admin
- Full CRUD access to users, classes, students, and parent↔student links
- Uses custom admin pages under `/app/admin/...` (not Django admin)

### Teacher
- Can only access their own classes
- Can create homework and announcements for their classes
- Can mark student homework statuses as checked

### Parent
- Can self-register
- Can be linked to one or more students
- Can view homework and announcements for linked students/classes
- Can manage personal to-dos

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django, Django REST Framework (DRF) |
| Authentication | JWT via `djangorestframework-simplejwt` |
| Database | SQLite (local dev) |
| Frontend | Django Templates + Vanilla JavaScript + TailwindCSS (CDN) |

---

## Installation & Setup Instructions

> **Prerequisites:** Python 3.x, pip

From the repo root:

**1. Create and activate a virtual environment**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

**2. Install dependencies**

```bash
pip install -r backend/requirements.txt
```

**3. Create your env file** *(optional)*

```bash
cp backend/.env.example backend/.env
```

**4. Apply migrations**

```bash
python3 backend/manage.py migrate
```

**5. Seed realistic mock data** *(recommended)*

```bash
python3 backend/manage.py seed_mock_data
```

> Default password for all seeded users is `password123`.

---

## How to Run the System

Start the Django development server:

```bash
python3 backend/manage.py runserver
```

Then open the app in your browser:

| Role | URL |
|------|-----|
| Login | `GET /app/login/` |
| Register (Parent) | `GET /app/register/` |
| Parent dashboard | `GET /app/parent/` |
| Teacher dashboard | `GET /app/teacher/` |
| Admin dashboard | `GET /app/admin/` |

**Selected API endpoints:**

<details>
<summary>Auth</summary>

```
POST   /api/auth/token/
POST   /api/auth/register/
GET    /api/auth/me/
```
</details>

<details>
<summary>Admin</summary>

```
GET/POST/PATCH/DELETE  /api/admin/users/...
GET/POST/PATCH/DELETE  /api/admin/classes/...
GET/POST/PATCH/DELETE  /api/admin/students/...
GET/POST/PATCH/DELETE  /api/admin/parent-students/...
```
</details>

<details>
<summary>Teacher</summary>

```
GET    /api/teacher/classes/
POST   /api/teacher/classes/<class_id>/homework/
POST   /api/teacher/classes/<class_id>/announcements/
```
</details>

<details>
<summary>Parent</summary>

```
GET    /api/parent/homework-todos/grouped/
PATCH  /api/parent/homework-status/<status_id>/submitted/
GET/POST/PATCH/DELETE  /api/parent/todos/...
```
</details>

---

## Screenshots

### Authentication

| Login | Register |
|-------|----------|
| ![Login screen](docs/screenshots/login.png) | ![Registration screen](docs/screenshots/register.png) |

### Parent Views

| Dashboard | Homework | Announcements |
|-----------|----------|---------------|
| ![Parent dashboard](docs/screenshots/parent-dashbaord.png) | ![Parent homework tab](docs/screenshots/parent-homework.png) | ![Parent announcements tab](docs/screenshots/parent-announ.png) |

| To-Do List | Profile |
|------------|---------|
| ![Parent todo tab](docs/screenshots/parent-todo.png) | ![Parent profile](docs/screenshots/parent-profile.png) |

### Teacher Views

| Dashboard | Homework | Status |
|-----------|----------|--------|
| ![Teacher dashboard](docs/screenshots/t-dash.png) | ![Teacher homework tab](docs/screenshots/t-home.png) | ![Teacher homework status tab](docs/screenshots/t-status.png) |

| Announcements | Profile |
|---------------|---------|
| ![Teacher announcement tab](docs/screenshots/t-announce.png) | ![Teacher profile](docs/screenshots/t-profile.png) |

### Admin Views

| Dashboard | Users | Students |
|-----------|-------|----------|
| ![Admin dashboard](docs/screenshots/admin-dashboard.png) | ![Admin users list](docs/screenshots/admin-userlist.png) | ![Admin student list](docs/screenshots/admin-stu-list.png) |

| Classes | Parent Links |
|---------|-------------|
| ![Admin class list](docs/screenshots/admin-classlist.png) | ![Admin parent link](docs/screenshots/admin-link.png) |