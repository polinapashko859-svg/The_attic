import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchSketches, deleteSketch, addSketch } from '../api';
import useDebounce from '../hooks/useDebounce'; 
import { normalizeSketchBranch, SKETCH_BRANCHES } from '../constants/sketchBranches';
import UserAvatar from './UserAvatar';
import {
  CONTENT_MAX_LENGTH,
  CONTENT_MIN_LENGTH,
  IMAGE_URL_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH
} from '../constants/sketchLimits';

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
  const [formError, setFormError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
    } catch {
      setSketches((prev) => [sketchToDelete, ...prev]);
      showToast("Ошибка удаления. Набросок восстановлен.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    const content = newContent.trim();
    const imageUrl = newImage.trim() || null;

    if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
      setFormError(`Заголовок должен содержать от ${TITLE_MIN_LENGTH} до ${TITLE_MAX_LENGTH} символов.`);
      return;
    }
    if (content.length < CONTENT_MIN_LENGTH || content.length > CONTENT_MAX_LENGTH) {
      setFormError(`Текст должен содержать от ${CONTENT_MIN_LENGTH} до ${CONTENT_MAX_LENGTH} символов.`);
      return;
    }

    const words = content.split(/\s+/).length;
    const readingTime = Math.ceil(words / 150) || 1;
    const tempId = `temp-${Date.now()}`;

    const optimisticSketch = {
      id: tempId,
      title,
      content,
      author: user.name || "Аноним",
      paperType: newPaper,
      readingTime,
      imageUrl,
      createdAt: new Date().toISOString(),
      userId: user.id
    };

    setSketches((prev) => [optimisticSketch, ...prev]);
    setIsCreating(true);
    setFormError('');

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
      setIsCreateOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewImage('');
      setNewPaper('parchment');
      showToast("Набросок успешно создан!");
    } catch (err) {
      setSketches((prev) => prev.filter(item => item.id !== tempId));
      setFormError(err.response?.data?.error || "Не удалось создать публикацию. Попробуйте ещё раз.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredSketches = sketches
    .filter((sketch) => filterPaper === 'all' || normalizeSketchBranch(sketch.paperType) === filterPaper)
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
          <form className="modal-content create-sketch-form" onSubmit={handleCreate}>
            <h3 style={{ textAlign: 'center' }}>Новый набросок</h3>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="form-group">
              <label>Заголовок:</label>
              <input
                className="form-control"
                value={newTitle}
                onChange={e => { setNewTitle(e.target.value); setFormError(''); }}
                minLength={TITLE_MIN_LENGTH}
                maxLength={TITLE_MAX_LENGTH}
                required
              />
              <span className="field-hint">{newTitle.length}/{TITLE_MAX_LENGTH} символов</span>
            </div>
            <div className="form-group">
              <label>Ветка:</label>
              <select className="form-control" value={newPaper} onChange={e => setNewPaper(e.target.value)}>
                {SKETCH_BRANCHES.map(branch => (
                  <option key={branch.value} value={branch.value}>{branch.icon} {branch.label}</option>
                ))}
              </select>
              <p className="branch-hint">
                {SKETCH_BRANCHES.find(branch => branch.value === newPaper)?.hint}
              </p>
            </div>
            <div className="form-group">
              <label>Ссылка на фото:</label>
              <input
                type="url"
                className="form-control"
                value={newImage}
                onChange={e => { setNewImage(e.target.value); setFormError(''); }}
                maxLength={IMAGE_URL_MAX_LENGTH}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label>Текст:</label>
              <textarea
                className="form-control"
                rows="5"
                value={newContent}
                onChange={e => { setNewContent(e.target.value); setFormError(''); }}
                minLength={CONTENT_MIN_LENGTH}
                maxLength={CONTENT_MAX_LENGTH}
                required
              />
              <span className="field-hint">{newContent.length}/{CONTENT_MAX_LENGTH} символов</span>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={isCreating}>
                {isCreating ? 'Публикуем...' : 'Опубликовать'}
              </button>
              <button type="button" className="btn-cancel" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div className="feed-toolbar">
        <div>
          <h1>Лента чердака</h1>
          <p>Истории, мысли и воспоминания из разных уголков чердака.</p>
        </div>
        {user && (
          <button className="btn-primary feed-create-button" onClick={() => { setFormError(''); setIsCreateOpen(true); }}>
            + Написать
          </button>
        )}
      </div>

      <section className="branch-browser">
        <div className="branch-browser-heading">
          <div>
            <span className="branch-eyebrow">АРХИВ ЧЕРДАКА</span>
            <h2>Выберите свою ветку</h2>
            <p>У каждой истории — своя бумага, настроение и глава.</p>
          </div>
          <button
            type="button"
            className={`branch-all-button ${filterPaper === 'all' ? 'active' : ''}`}
            aria-pressed={filterPaper === 'all'}
            onClick={() => setFilterPaper('all')}
          >
            Все истории <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="branches-nav" role="group" aria-label="Фильтр по веткам">
          {SKETCH_BRANCHES.map((branch, index) => (
            <button
              key={branch.value}
              type="button"
              className={`branch-card branch-${branch.value} ${filterPaper === branch.value ? 'active' : ''}`}
              data-index={`0${index + 1}`}
              aria-pressed={filterPaper === branch.value}
              onClick={() => setFilterPaper(branch.value)}
            >
              <span className="branch-card-top">
                <span className="branch-card-index">ГЛАВА 0{index + 1}</span>
                <span className="branch-card-mark" aria-hidden="true">{branch.icon}</span>
              </span>
              <span className="branch-card-title">{branch.shortLabel}</span>
              <span className="branch-card-description">{branch.hint}</span>
              <span className="branch-card-open">Открыть ветку <span aria-hidden="true">↗</span></span>
            </button>
          ))}
        </div>
      </section>

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
            const profileId = sketch.userId || sketch.user?.id;
            const author = sketch.user?.name || sketch.author || 'Аноним';

            return (
              <article 
                key={sketch.id} 
                className={`sketch-card paper-card-${normalizeSketchBranch(sketch.paperType)}`}
                onClick={() => !sketch.id.toString().startsWith('temp-') && navigate(`/sketch/${sketch.id}`)}
              >
                <div className="card-header-user" onClick={(e) => e.stopPropagation()}>
                  {profileId ? (
                    <Link to={`/users/${profileId}`} className="author-profile-link" aria-label={`Профиль автора ${author}`}>
                      <UserAvatar user={{ name: author, avatarUrl: sketch.user?.avatarUrl }} className="author-avatar" />
                      <span className="author-info">
                        <span className="author-name">{author}</span>
                        <span className="post-time">{new Date(sketch.createdAt).toLocaleString('ru-RU')}</span>
                      </span>
                    </Link>
                  ) : (
                    <>
                      <UserAvatar user={{ name: author }} className="author-avatar" />
                      <div className="author-info">
                        <span className="author-name">{author}</span>
                        <span className="post-time">{new Date(sketch.createdAt).toLocaleString('ru-RU')}</span>
                      </div>
                    </>
                  )}
                  
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