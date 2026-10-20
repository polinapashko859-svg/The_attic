import { useState, useEffect } from 'react';
import { fetchSketches, addSketch, updateSketch, deleteSketch } from '../api';

export default function SketchList() {
  const [sketches, setSketches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const [toastMessage, setToastMessage] = useState(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [paperType, setPaperType] = useState('parchment');
  const [readingTime, setReadingTime] = useState(2);
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');

  const [editingId, setEditingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaper, setFilterPaper] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const loadSketchesWithRetry = async (maxRetries = 3, delay = 1000) => {
    setLoading(true);
    setError(null);
    setRetryAttempt(0);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchSketches();
        setSketches(response.data);
        setLoading(false);
        setRetryAttempt(0);
        return;
      } catch (err) {
        if (attempt < maxRetries) {
          setRetryAttempt(attempt);
          await wait(delay);
        } else {
          console.error(err);
          setError("Сервер недоступен после 3 попыток подключения. Проверьте соединение с портом 3000.");
          setLoading(false);
          setRetryAttempt(0);
        }
      }
    }
  };

  useEffect(() => {
    loadSketchesWithRetry();
  }, []);

  useEffect(() => {
    document.title = `Наброски (${sketches.length}) — The Attic`;
  }, [sketches.length]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setPaperType('parchment');
    setReadingTime(2);
    setImageUrl('');
    setContent('');
    setEditingId(null);
  };

  const handleAdd = async (newSketchData) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticSketch = {
      ...newSketchData,
      id: tempId,
      createdAt: new Date().toLocaleString('ru-RU')
    };

    setSketches((prev) => [optimisticSketch, ...prev]);
    resetForm();

    try {
      const response = await addSketch(newSketchData);
      setSketches((prev) =>
        prev.map((item) => (item.id === tempId ? response.data : item))
      );
    } catch (err) {
      console.error(err);
      setSketches((prev) => prev.filter((item) => item.id !== tempId));
      showToast("Ошибка сервера: не удалось сохранить набросок. Изменение отменено.");
    }
  };

  const handleDelete = async (id) => {
    const sketchToDelete = sketches.find((item) => item.id === id);
    if (!sketchToDelete) return;

    if (!window.confirm("Удалить этот набросок из базы данных чердака?")) return;

    setSketches((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) resetForm();

    try {
      await deleteSketch(id);
    } catch (err) {
      console.error(err);
      setSketches((prev) => [sketchToDelete, ...prev]);
      showToast("Не удалось удалить набросок на сервере. Карточка восстановлена.");
    }
  };

  const handleUpdate = async (updatedData) => {
    const originalSketch = sketches.find((item) => item.id === updatedData.id);
    if (!originalSketch) return;

    setSketches((prev) =>
      prev.map((item) => (item.id === updatedData.id ? { ...item, ...updatedData } : item))
    );
    resetForm();

    try {
      await updateSketch(updatedData.id, updatedData);
    } catch (err) {
      console.error(err);
      setSketches((prev) =>
        prev.map((item) => (item.id === originalSketch.id ? originalSketch : item))
      );
      showToast("Сервер отклонил изменения. Текст наброска возвращен к исходному.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim() || !author.trim() || !content.trim()) {
      alert("Пожалуйста, заполните заголовок, автора и текст наброска!");
      return;
    }

    const payload = {
      title: title.trim(),
      author: author.trim(),
      paperType,
      readingTime: Number(readingTime) >= 0 ? Number(readingTime) : 1,
      imageUrl: imageUrl.trim() || null,
      content: content.trim()
    };

    if (editingId !== null) {
      handleUpdate({ ...payload, id: editingId });
    } else {
      handleAdd(payload);
    }
  };

  const handleStartEdit = (sketch) => {
    setEditingId(sketch.id);
    setTitle(sketch.title);
    setAuthor(sketch.author);
    setPaperType(sketch.paperType);
    setReadingTime(sketch.readingTime || 2);
    setImageUrl(sketch.imageUrl || '');
    setContent(sketch.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredSketches = sketches
    .filter((sketch) => {
      const matchesPaper = filterPaper === 'all' || sketch.paperType === filterPaper;
      const matchesSearch =
        (sketch.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sketch.author || '').toLowerCase().includes(searchQuery.toLowerCase());
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
      {toastMessage && (
        <div className="toast-rollback-notification">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      <div className="stats-bar">
        <div className="stat-item">
          <span>Всего набросков в базе данных:</span> <strong>{sketches.length}</strong>
        </div>
        <div className="save-indicator" style={{ background: '#1c1b26', borderColor: '#483f6b', color: '#c5baf5' }}>
          PostgreSQL REST API + Retry
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="form-title">
          {editingId ? "Редактирование наброска" : "Оставить набросок в базе"}
        </h2>

        <div className="form-group">
          <label>Заголовок наброска:</label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Старинный компас"
            required
          />
        </div>

        <div className="form-row-3col">
          <div className="form-group">
            <label>Ваше имя:</label>
            <input
              type="text"
              className="form-control"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Например: Polina"
              required
            />
          </div>

          <div className="form-group">
            <label>Фактура бумаги:</label>
            <select
              className="form-control"
              value={paperType}
              onChange={(e) => setPaperType(e.target.value)}
            >
              <option value="parchment">Пергамент</option>
              <option value="kraft">Крафт</option>
              <option value="linen">Лён</option>
              <option value="pressed-flower">Сухоцвет</option>
            </select>
          </div>

          <div className="form-group">
            <label>Время чтения (мин, ≥ 0):</label>
            <input
              type="number"
              className="form-control"
              min="0"
              max="120"
              value={readingTime}
              onChange={(e) => setReadingTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Ссылка на фото (необязательно):</label>
          <input
            type="url"
            className="form-control"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://i.pinimg.com/...jpg"
          />
        </div>

        <div className="form-group">
          <label>Текст наброска:</label>
          <textarea
            rows="3"
            className="form-control"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Опишите вашу мысль или воспоминание..."
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? "Сохранить на сервере" : "Опубликовать набросок"}
          </button>
          {editingId && (
            <button type="button" className="btn-cancel" onClick={resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>

      <div className="filter-panel">
        <div className="filter-group">
          <label>Живой поиск:</label>
          <input
            type="text"
            className="form-control"
            placeholder="Поиск по названию или автору..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Фактура бумаги:</label>
          <select
            className="form-control"
            value={filterPaper}
            onChange={(e) => setFilterPaper(e.target.value)}
          >
            <option value="all">Все фактуры</option>
            <option value="parchment">Пергамент</option>
            <option value="kraft">Крафт</option>
            <option value="linen">Лён</option>
            <option value="pressed-flower">Сухоцвет</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Сортировка:</label>
          <select
            className="form-control"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
            <option value="readingTime">По времени чтения</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loader-box">
          <div className="candle-flicker">🕯️</div>
          <p style={{ marginTop: '15px' }}>
            {retryAttempt > 0
              ? `Повтор запроса к серверу: попытка ${retryAttempt} из 3...`
              : "Загрузка набросков из базы данных..."}
          </p>
        </div>
      ) : error ? (
        <div className="empty-message-full" style={{ borderColor: '#8f212f', background: '#1c1012' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '10px' }}>⚠️</span>
          <h3 style={{ color: '#f8b4b4', marginBottom: '10px', fontSize: '1.4rem' }}>Связь с сервером отсутствует</h3>
          <p style={{ color: '#a89687', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px' }}>
            {error}
          </p>
          <button type="button" className="btn-primary" onClick={() => loadSketchesWithRetry()} style={{ background: '#731924' }}>
            Повторить попытку
          </button>
        </div>
      ) : filteredSketches.length > 0 ? (
        <div className="card-grid-pinterest">
          {filteredSketches.map((sketch) => (
            <article key={sketch.id} className={`sketch-card paper-card-${sketch.paperType}`}>
              <div className="card-header-user">
                <div className="author-avatar" title={sketch.author}>
                  {sketch.author ? sketch.author[0].toUpperCase() : 'A'}
                </div>
                <div className="author-info">
                  <span className="author-name">{sketch.author}</span>
                  <span className="post-time">{sketch.createdAt}</span>
                </div>
                <span className={`tag-paper paper-${sketch.paperType}`}>
                  {sketch.paperType}
                </span>
              </div>

              <h2 className="sketch-title">{sketch.title}</h2>
              <p className="sketch-content">{sketch.content}</p>

              {sketch.imageUrl && (
                <div className="sketch-image-wrapper">
                  <img src={sketch.imageUrl} alt={sketch.title} loading="lazy" />
                </div>
              )}

              <div className="card-actions-bar">
                <span className="action-btn" title="Время чтения">
                  ⏳ <span>{sketch.readingTime || 2} мин</span>
                </span>

                <button
                  type="button"
                  className="action-btn"
                  onClick={() => handleStartEdit(sketch)}
                  title="Редактировать"
                >
                  Изменить
                </button>

                <button
                  type="button"
                  className="action-btn btn-delete"
                  onClick={() => handleDelete(sketch.id)}
                  title="Удалить"
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-message-full">
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
            В базе данных чердака пока нет подходящих набросков.
          </p>
        </div>
      )}
    </div>
  );
}