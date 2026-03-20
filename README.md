# Task Manager — Full Stack Project

A full-stack task manager application with a REST API backend and React frontend.

## Tech Stack
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** React + Axios

## Project Structure
```
task-manager/
├── backend/
│   ├── server.js        # Express server & all API routes
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js       # Main React component
│   │   ├── App.css      # Styles
│   │   └── index.js
│   ├── public/
│   └── package.json
└── README.md
```

## Quick Start

### Backend
```bash
cd backend
npm install
node server.js
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List all tasks |
| GET | /api/tasks/:id | Get single task |
| POST | /api/tasks | Create a task |
| PUT | /api/tasks/:id | Update a task |
| PATCH | /api/tasks/:id/toggle | Toggle complete/pending |
| DELETE | /api/tasks/:id | Delete a task |
| GET | /api/health | Health check |

## Deployment
See `INSTRUCTIONS.pdf` for full deployment guide.
