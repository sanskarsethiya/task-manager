import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',    emoji: '○' },
  inprocess: { label: 'In Process', emoji: '◑' },
  completed: { label: 'Completed',  emoji: '●' },
};

function Modal({ task, onClose, onSave }) {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]           = useState('pending');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  // Pre-fill when editing — runs once when modal opens
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'pending');
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setError(''); setLoading(true);
    try { await onSave({ title, description, status }); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h2>{task ? '✏️ Edit Task' : '✨ New Task'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label>Title <span>*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              rows={3}
            />
          </div>
          <div className="field">
            <label>Status</label>
            <div className="status-picker">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button type="button" key={key}
                  className={`status-option ${key} ${status === key ? 'active' : ''}`}
                  onClick={() => setStatus(key)}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-btns">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, onCycle, onEdit, onDelete }) {
  const cfg  = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const date = new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className={`card ${task.status}`}>
      <button
        className={`cycle-btn ${task.status}`}
        onClick={() => onCycle(task.id)}
        title="Click to change status"
      >
        {cfg.emoji}
      </button>

      <div className="card-body">
        <p className={`card-title ${task.status === 'completed' ? 'done' : ''}`}>
          {task.title}
        </p>
        {task.description && <p className="card-desc">{task.description}</p>}
        <span className={`badge ${task.status}`}>{cfg.label}</span>
      </div>

      <div className="card-right">
        <span className="card-date">{date}</span>
        <div className="card-actions">
          <button className="act-btn edit" onClick={() => onEdit(task)} title="Edit">✏️</button>
          <button className="act-btn del"
            onClick={() => { if (window.confirm('Delete this task?')) onDelete(task.id); }}
            title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [sortBy,    setSortBy]    = useState('newest');
  const [showModal, setShowModal] = useState(false);
  const [editTask,  setEditTask]  = useState(null);
  const [apiError,  setApiError]  = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      setApiError('');
      const res = await axios.get(`${API_BASE}/tasks`);
      setTasks(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      setApiError('Cannot connect to backend. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleAdd = async (data) => {
    const res = await axios.post(`${API_BASE}/tasks`, data);
    setTasks(prev => [res.data.data, ...prev]);
  };

  const handleEdit = async (data) => {
    const res = await axios.put(`${API_BASE}/tasks/${editTask.id}`, data);
    setTasks(prev => prev.map(t => t.id === editTask.id ? res.data.data : t));
  };

  const handleCycle = async (id) => {
    const res = await axios.patch(`${API_BASE}/tasks/${id}/cycle`);
    setTasks(prev => prev.map(t => t.id === id ? res.data.data : t));
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_BASE}/tasks/${id}`);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Stats always calculated from full tasks array
  const stats = {
    all:       tasks.length,
    pending:   tasks.filter(t => t.status === 'pending').length,
    inprocess: tasks.filter(t => t.status === 'inprocess').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const progress = tasks.length
    ? Math.round((stats.completed / tasks.length) * 100)
    : 0;

  // Filter → search → sort
  let filtered = filter === 'all' ? [...tasks] : tasks.filter(t => t.status === filter);

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }

  if (sortBy === 'newest') filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sortBy === 'oldest') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (sortBy === 'title')  filtered.sort((a, b) => a.title.localeCompare(b.title));

  const filterLabel = {
    all: '👋 All Tasks', pending: '○ Pending',
    inprocess: '◑ In Process', completed: '● Completed'
  };

  return (
    <div className="app">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">✓</div>

        <nav className="sidebar-nav">
          {[
            { key: 'all',       icon: '⊞', label: 'All Tasks',  count: stats.all },
            { key: 'pending',   icon: '○', label: 'Pending',    count: stats.pending },
            { key: 'inprocess', icon: '◑', label: 'In Process', count: stats.inprocess },
            { key: 'completed', icon: '●', label: 'Completed',  count: stats.completed },
          ].map(item => (
            <button
              key={item.key}
              className={`nav-item ${filter === item.key ? 'active' : ''}`}
              onClick={() => setFilter(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-count">{item.count}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-progress">
          <p className="prog-label">Overall Progress</p>
          <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="prog-pct">{progress}% done</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">

        {/* Topbar */}
        <div className="topbar">
          <div>
            <h1 className="page-title">{filterLabel[filter]}</h1>
            <p className="page-sub">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn-new" onClick={() => { setEditTask(null); setShowModal(true); }}>
            + New Task
          </button>
        </div>

        {/* Stat Cards */}
        <div className="stat-grid">
          {[
            { label: 'Total',      value: stats.all,       icon: '📋', cls: '',       key: 'all'       },
            { label: 'Pending',    value: stats.pending,   icon: '🕐', cls: 'orange', key: 'pending'   },
            { label: 'In Process', value: stats.inprocess, icon: '⚡', cls: 'blue',   key: 'inprocess' },
            { label: 'Completed',  value: stats.completed, icon: '✅', cls: 'green',  key: 'completed' },
          ].map(s => (
            <div
              key={s.label}
              className={`stat-card ${s.cls} ${filter === s.key ? 'active-card' : ''}`}
              onClick={() => setFilter(s.key)}
            >
              <span className="stat-icon">{s.icon}</span>
              <div>
                <p className="stat-val">{s.value}</p>
                <p className="stat-lbl">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Sort bar */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">A → Z</option>
          </select>
        </div>

        {/* Error */}
        {apiError && <div className="api-err">{apiError}</div>}

        {/* Task list */}
        {loading ? (
          <div className="empty">
            <div className="spinner" />
            <p>Loading tasks...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <p className="empty-icon">{search ? '🔍' : filter === 'completed' ? '🎉' : '📝'}</p>
            <h3>
              {search
                ? `No results for "${search}"`
                : filter === 'all' ? 'No tasks yet' : `No ${STATUS_CONFIG[filter]?.label} tasks`}
            </h3>
            <p>
              {search ? 'Try a different search term'
                : filter === 'all' ? 'Click + New Task to get started'
                : ''}
            </p>
            {!search && filter === 'all' && (
              <button className="btn-new" style={{ marginTop: 8 }}
                onClick={() => setShowModal(true)}>+ Add Task</button>
            )}
          </div>
        ) : (
          <div className="task-list">
            {filtered.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onCycle={handleCycle}
                onEdit={t => { setEditTask(t); setShowModal(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <Modal
          task={editTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSave={editTask ? handleEdit : handleAdd}
        />
      )}
    </div>
  );
}