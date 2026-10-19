# ISKCON LMS – Learning Management System

A comprehensive, production-quality Learning Management System built for ISKCON to manage spiritual education courses, students, instructors, live Zoom classes, assignments, attendance tracking, and role-based administration.

![Architecture](./architecture.png)

## ✨ Features

### 🔐 Authentication & Security
- Supabase Authentication (email/password)
- JWT-based session management with auto-refresh
- Role-Based Access Control (RBAC) — Student, Instructor, Admin
- Protected routes on both frontend and backend
- Backend authorization middleware on all API endpoints
- No secrets exposed to frontend

### 📊 Role-Based Dashboards
- **Student**: Enrolled courses, upcoming sessions, pending assignments, attendance summary
- **Instructor**: Assigned courses, student counts, upcoming sessions, quick actions
- **Admin**: System statistics, user management, recent activity, 7 stat cards

### 📚 Course Management
- Create courses with auto-generated 7-character codes
- Assign instructors to courses
- Enroll students in courses
- Course detail with tabbed interface (Overview, Materials, Assignments, Sessions, Students, Attendance)

### 📝 Assignments
- Create assignments with title, description, due date
- Student submission workflow (URL or text)
- Late submission detection
- Instructor grading with marks and feedback
- Status badges: Pending, Submitted, Late, Graded

### 📄 Materials
- Upload learning materials with URLs
- Title and description
- View/download resources

### 🎥 Zoom Live Sessions
- Backend Zoom OAuth (Server-to-Server/Account Credentials)
- Create Zoom meetings directly from the LMS
- Store meeting ID, join URL, start URL
- Students: Join session button
- Instructors: Start session button
- Session status tracking

### ✅ Attendance
- Fetch Zoom meeting participant reports
- Sync attendance to database
- Match Zoom participants to LMS students
- View attendance per session with join/leave times and duration
- Mark sessions as completed

### 👥 User Management (Admin)
- View all users with search and role filters
- Create students, instructors, and admins
- Delete admin accounts (with self-deletion protection)
- Atomic user creation with rollback on failure

## 🏗️ Architecture

```
Users → React Frontend (Vite + Tailwind) → Express Backend → Supabase (PostgreSQL + Auth) → Zoom API
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3, React Router v6, Lucide React, Axios |
| Backend | Node.js, Express.js, Axios, dotenv, Supabase JS |
| Database | Supabase PostgreSQL + Auth + RLS |
| External | Zoom OAuth API (Server-to-Server) |

## 📁 Project Structure

```
ServiceLearning_LMS/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Card, Button, Input, Modal, Table, Badge, Toast, EmptyState
│   │   │   └── navigation/    # Sidebar, TopNav
│   │   ├── context/           # AuthContext
│   │   ├── layouts/           # DashboardLayout
│   │   ├── lib/               # supabase.js, api.js
│   │   ├── pages/
│   │   │   ├── admin/         # Dashboard, Users, Courses, Settings
│   │   │   ├── instructor/    # Dashboard
│   │   │   ├── student/       # Dashboard
│   │   │   └── shared/        # Courses, CourseDetail, Sessions, Assignments, Submissions, Attendance, Profile
│   │   ├── utils/             # constants.js, helpers.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── middleware/             # auth.js, role.js
│   ├── routes/                 # auth, admin, courses, liveSessions, attendance, assignments, materials, users
│   ├── services/               # zoom.js
│   ├── supabase/               # client.js
│   └── server.js
├── database/
│   ├── schema.sql              # Complete database schema
│   └── seed.sql                # Sample data
└── README.md
```

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with id, full_name, email, role |
| `courses` | Courses with course_code, course_name, description |
| `course_instructors` | Instructor-course assignments (junction) |
| `course_enrollments` | Student-course enrollments (junction) |
| `live_sessions` | Zoom live session records |
| `session_attendance` | Attendance records from Zoom |
| `assignments` | Course assignments |
| `assignment_submissions` | Student assignment submissions |
| `materials` | Course learning materials |

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password |
| GET | `/auth/profile` | Get current user profile |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Dashboard statistics |
| GET | `/admin/users` | List users (search/filter) |
| POST | `/admin/create-student` | Create student |
| POST | `/admin/create-instructor` | Create instructor |
| POST | `/admin/create-admin` | Create admin |
| DELETE | `/admin/delete-admin/:id` | Delete admin |
| POST | `/admin/courses` | Create course |
| GET | `/admin/courses` | List all courses |
| POST | `/admin/assign-instructor` | Assign instructor to course |
| POST | `/admin/enroll-student` | Enroll student in course |
| GET | `/admin/instructors` | List instructors |
| GET | `/admin/students` | List students |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses` | List user's courses |
| GET | `/courses/:id` | Course details |
| GET | `/courses/:id/students` | Course students |

### Live Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/live-sessions/create` | Create Zoom meeting |
| GET | `/live-sessions/course/:id` | Course sessions |
| GET | `/live-sessions/upcoming` | Upcoming sessions |
| GET | `/live-sessions/all` | All sessions (admin) |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attendance/fetch/:id` | Sync from Zoom |
| GET | `/attendance/session/:id` | Session attendance |
| GET | `/attendance/student/:id` | Student attendance |
| GET | `/attendance/course/:id` | Course attendance |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assignments` | Create assignment |
| GET | `/assignments/course/:id` | Course assignments |
| POST | `/assignments/:id/submit` | Submit assignment |
| GET | `/assignments/:id/submissions` | View submissions |
| PUT | `/assignments/:id/grade/:subId` | Grade submission |
| DELETE | `/assignments/:id` | Delete assignment |
| GET | `/assignments/pending/me` | Pending assignments |

### Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/materials` | Create material |
| GET | `/materials/course/:id` | Course materials |
| DELETE | `/materials/:id` | Delete material |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Current profile |
| PUT | `/users/profile` | Update profile |
| GET | `/users/dashboard-stats` | Dashboard stats |

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- npm
- Supabase account (free tier works)
- Zoom Server-to-Server OAuth app (for live sessions)

### 1. Clone & Install

```bash
# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `database/schema.sql`
3. Optionally run `database/seed.sql` for sample data
4. Go to **Settings > API** to get your project URL, anon key, and service role key
5. Go to **Authentication > Users** to create your first admin user
6. Then in SQL Editor, insert the admin profile:

```sql
INSERT INTO profiles (id, full_name, email, role)
VALUES ('your-auth-user-uuid', 'Admin Prabhu', 'admin@iskcon.org', 'admin');
```

### 3. Zoom Setup (Optional)

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Create a **Server-to-Server OAuth** app
3. Note the Account ID, Client ID, and Client Secret
4. Required scopes: `meeting:write:admin`, `meeting:read:admin`, `report:read:admin`

### 4. Environment Variables

**Backend** (`backend/.env`):
```
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
```

**Frontend** (`frontend/.env`):
```
VITE_SUPABASE_PROJECT_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000
```

### 5. Run

```bash
# Terminal 1 – Backend
cd backend
npm run dev

# Terminal 2 – Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 🧪 Demo Setup

1. Create users via Supabase Dashboard or Admin UI:
   - Admin: `admin@iskcon.org`
   - Instructor: `instructor@iskcon.org`
   - Student: `student@iskcon.org`

2. Run `database/seed.sql` for sample courses

3. Login as admin → Create more users → Create courses → Assign instructors → Enroll students

## 🔒 Security

- Backend validates JWT on every request
- Role-based middleware on all protected endpoints
- Supabase Row Level Security (RLS) enabled
- Service role key only used server-side
- No secrets in frontend code
- CORS restricted to frontend origin
- Input validation on all endpoints

## 📱 Responsive Design

Fully responsive across desktop, laptop, tablet, and mobile:
- Collapsible sidebar with mobile overlay
- Horizontally scrollable tables
- Adaptive card layouts
- Touch-friendly interaction targets

## 📝 License

This project is for educational purposes as part of ISKCON's spiritual education initiative.
