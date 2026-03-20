const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(path.join(__dirname, 'tasks.db'), (err) => {
  if (err) console.error('DB error:', err);
  else console.log('✅ Connected to SQLite database');
});

db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'inprocess', 'completed')),
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.get('/api/tasks/:id', (req, res) => {
  db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: row });
  });
});

app.post('/api/tasks', (req, res) => {
  const { title, description = '', status = 'pending' } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }
  db.run(
    'INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)',
    [title.trim(), description.trim(), status],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, row) => {
        res.status(201).json({ success: true, data: row });
      });
    }
  );
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, status } = req.body;
  if (title !== undefined && title.trim() === '') {
    return res.status(400).json({ success: false, error: 'Title cannot be empty' });
  }
  db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, existing) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!existing) return res.status(404).json({ success: false, error: 'Task not found' });

    const updatedTitle = title !== undefined ? title.trim() : existing.title;
    const updatedDesc = description !== undefined ? description.trim() : existing.description;
    const updatedStatus = status !== undefined ? status : existing.status;

    db.run(
      'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?',
      [updatedTitle, updatedDesc, updatedStatus, req.params.id],
      (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
          res.json({ success: true, data: row });
        });
      }
    );
  });
});

app.patch('/api/tasks/:id/cycle', (req, res) => {
  db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, task) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    const cycle = { pending: 'inprocess', inprocess: 'completed', completed: 'pending' };
    const newStatus = cycle[task.status] || 'pending';

    db.run('UPDATE tasks SET status = ? WHERE id = ?', [newStatus, req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
        res.json({ success: true, data: row });
      });
    });
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, task) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, message: 'Task deleted successfully' });
    });
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Task Manager API is running' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});