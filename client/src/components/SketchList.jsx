import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSketches, deleteSketch, addSketch } from '../api';
import useDebounce from '../hooks/useDebounce'; 

const BRANCHES = [
  { id: 'all', label: 'Все ветки', icon: '🗂️' },
  { id: 'parchment', label: 'Хроники', icon: '📜' },
  { id: 'kraft', label: 'Странник', icon: '🧭' },
  { id: 'linen', label: 'Уют', icon: '☕' },
  { id: 'pressed-flower', label: 'Гербарий', icon: '🌸' }
];

const PAPER_TYPES = [
  { value: 'parchment', label: '📜 Старинные хроники' },
  { value: 'kraft', label: '🧭 Дневник странника' },
  { value: 'linen', label: '☕ Уютные мысли' },
  { value: 'pressed-flower', label: '🌸 Гербарий воспоминаний' }
];

export default function SketchList({ user }) {
  const [sketches, setSketches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500); 
  const [filterPaper, setFilterPaper] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPaper, setNewPaper] = useState('parchment');
  const [newImage, setNewImage] = useState('');

  const menuRef = useRef(null);
  const navigate = useNavigate();

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
    const controller = new AbortController();
    
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { signal: controller.signal };
        if (debouncedSearch) params.params = { search: debouncedSearch };
        
        const response = await fetchSketches(params);
        setSketches(response.data);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError("Сервер недоступен или произошла ошибка.");
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      controller.abort();
    };
  }, [debouncedSearch]);

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
      showToast("Ошибка удаления. Набросок восстановлен.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const words = newContent.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 150) || 1;
    const tempId = `temp-${Date.now()}`;

    const optimisticSketch = {
      id: tempId,
      title: newTitle,
      content: newContent,
      author: user.name || "Аноним",
      paperType: newPaper,
      readingTime,
      imageUrl: newImage || null,
      createdAt: new Date().toISOString(),
      userId: user.id
    };

    setSketches((prev) => [optimisticSketch, ...prev]);
    setIsCreateOpen(false); 

    setNewTitle(''); setNewContent(''); setNewImage(''); setNewPaper('parchment');

    try {
      const response = await addSketch({
        title: optimisticSketch.title,
        content: optimisticSketch.content,
        paperType: optimisticSketch.paperType,
        readingTime: optimisticSketch.readingTime,
        imageUrl: optimisticSketch.imageUrl
      });

      setSketches((prev) => 
        prev.map(item => item.id === tempId ? response.data : item)
      );
      showToast("Набросок успешно создан!");
    } catch (err) {
      setSketches((prev) => prev.filter(item => item.id !== tempId));
      showToast("Ошибка при создании. Набросок не сохранен.");
    }
  };

  const filteredSketches = sketches
    .filter((sketch) => filterPaper === 'all' || sketch.paperType === filterPaper)
    .sort((a, b) => {
      if (sortBy === 'newest') return b.id.toString().localeCompare(a.id.toString());
      if (sortBy === 'oldest') return a.id.toString().localeCompare(b.id.toString());
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

      {isCreateOpen && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleCreate} style={{ maxWidth: '600px', textAlign: 'left' }}>
            <h3 style={{ textAlign: 'center' }}>Новый набросок</h3>
            <div className="form-group">
              <label>Заголовок:</label>
              <input className="form-control" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Ветка:</label>
              <select className="form-control" value={newPaper} onChange={e => setNewPaper(e.target.value)}>
                {PAPER_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Ссылка на фото:</label>
              <input className="form-control" value={newImage} onChange={e => setNewImage(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Текст:</label>
              <textarea className="form-control" rows="5" value={newContent} onChange={e => setNewContent(e.target.value)} required />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary">Опубликовать</button>
              <button type="button" className="btn-cancel" onClick={() => setIsCreateOpen(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div className="branches-nav" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
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
        {user && (
          <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            + Написать
          </button>
        )}
      </div>

      <div className="filter-panel">
        <div className="filter-group">
          <input
            type="text"
            className="form-control"
            placeholder="Поиск на сервере (по тексту, автору)..."
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
      ) : error ? (
        <div className="empty-message-full">
          <p>{error}</p>
        </div>
      ) : (
        <div className="card-grid-pinterest">
          {filteredSketches.map((sketch) => {
            const isOwner = user && sketch.userId === user.id;
            const canEdit = isOwner || (user && user.role === 'admin');

            return (
              <article 
                key={sketch.id} 
                className={`sketch-card paper-card-${sketch.paperType}`}
                onClick={() => !sketch.id.toString().startsWith('temp-') && navigate(`/sketch/${sketch.id}`)}
              >
                <div className="card-header-user" onClick={(e) => e.stopPropagation()}>
                  <div className="author-avatar">{sketch.author ? sketch.author[0].toUpperCase() : 'A'}</div>
                  <div className="author-info">
                    <span className="author-name">{sketch.author}</span>
                    <span className="post-time">{new Date(sketch.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  
                  {canEdit && !sketch.id.toString().startsWith('temp-') && (
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