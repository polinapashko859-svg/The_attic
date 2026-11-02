import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSketches, deleteSketch } from '../api';

const BRANCHES = [
  { id: 'all', label: 'Все ветки', icon: '🗂️' },
  { id: 'parchment', label: 'Хроники', icon: '📜' },
  { id: 'kraft', label: 'Странник', icon: '🧭' },
  { id: 'linen', label: 'Уют', icon: '☕' },
  { id: 'pressed-flower', label: 'Гербарий', icon: '🌸' }
];

export default function SketchList({ user }) {
  const [sketches, setSketches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaper, setFilterPaper] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const isAuth = !!user;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    loadSketches();
  }, []);

  const loadSketches = async () => {
    setLoading(true);
    try {
      const response = await fetchSketches();
      setSketches(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const sketchToDelete = deleteTarget;
    setDeleteTarget(null);
    setOpenMenuId(null);

    setSketches((prev) => prev.filter((item) => item.id !== sketchToDelete.id));

    try {
      await deleteSketch(sketchToDelete.id);
      showToast("Набросок удален");
    } catch (err) {
      setSketches((prev) => [sketchToDelete, ...prev]);
      showToast("Ошибка удаления");
    }
  };

  const filteredSketches = sketches
    .filter((sketch) => {
      const matchesPaper = filterPaper === 'all' || sketch.paperType === filterPaper;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (sketch.title || '').toLowerCase().includes(searchLower) ||
        (sketch.content || '').toLowerCase().includes(searchLower);
      return matchesPaper && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.id - a.id;
      if (sortBy === 'oldest') return a.id - b.id;
      if (sortBy === 'readingTime') return (b.readingTime || 0) - (a.readingTime || 0);
      return 0;
    });

  return (
    <div className="sketch-manager">
      {toastMessage && <div className="toast-rollback-notification">{toastMessage}</div>}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Удалить набросок?</h3>
            <p>Вы уверены, что хотите навсегда удалить "{deleteTarget.title}"?</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={confirmDelete} style={{ background: '#731924' }}>Удалить</button>
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div className="branches-nav">
        {BRANCHES.map((branch) => (
          <button
            key={branch.id}
            type="button"
            className={`branch-tab ${filterPaper === branch.id ? 'active' : ''}`}
            onClick={() => setFilterPaper(branch.id)}
          >
            <span className="branch-icon">{branch.icon}</span>
            <span className="branch-label">{branch.label}</span>
          </button>
        ))}
      </div>

      <div className="filter-panel">
        <div className="filter-group">
          <input
            type="text"
            className="form-control"
            placeholder="Поиск по всему тексту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select className="form-control" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
            <option value="readingTime">По времени чтения</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loader-box"><div className="candle-flicker">🕯️</div></div>
      ) : (
        <div className="card-grid-pinterest">
          {filteredSketches.map((sketch) => {
            const isOwner = user && sketch.userId === user.id;
            const canEdit = isOwner || (user && user.role === 'admin');

            return (
              <article 
                key={sketch.id} 
                className={`sketch-card paper-card-${sketch.paperType}`}
                onClick={() => navigate(`/sketch/${sketch.id}`)}
              >
                <div className="card-header-user" onClick={(e) => e.stopPropagation()}>
                  <div className="author-avatar">{sketch.author ? sketch.author[0].toUpperCase() : 'A'}</div>
                  <div className="author-info">
                    <span className="author-name">{sketch.author}</span>
                    <span className="post-time">{new Date(sketch.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  
                  {canEdit && (
                    <div className="card-menu-wrapper" ref={openMenuId === sketch.id ? menuRef : null}>
                      <button type="button" className="menu-dots-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === sketch.id ? null : sketch.id); }}>
                        ⋮
                      </button>
                      {openMenuId === sketch.id && (
                        <div className="card-dropdown-menu">
                          <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/sketch/${sketch.id}`); }}>Открыть</button>
                          <button type="button" className="text-danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(sketch); }}>Удалить</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <h2 className="sketch-title">{sketch.title}</h2>
                <p className="sketch-content truncated-text">{sketch.content}</p>

                {sketch.imageUrl && (
                  <div className="sketch-image-wrapper">
                    <img src={sketch.imageUrl} alt={sketch.title} loading="lazy" />
                  </div>
                )}

                <div className="card-actions-bar">
                  <span className="action-time">⏳ {sketch.readingTime || 2} мин</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}