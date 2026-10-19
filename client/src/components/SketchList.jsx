import { useState, useEffect } from 'react';
import { initialSketches } from '../mockData';

export default function SketchList() {
  const [sketches, setSketches] = useState(() => {
    try {
      const saved = localStorage.getItem('attic_sketches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return initialSketches;
    } catch (e) {
      return initialSketches;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('Сохранено');

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

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setSaveStatus('Сохранение...');
    const timeout = setTimeout(() => {
      localStorage.setItem('attic_sketches', JSON.stringify(sketches));
      setSaveStatus('Сохранено в localStorage');
    }, 500);
    return () => clearTimeout(timeout);
  }, [sketches]);

  // Заголовок вкладки
  useEffect(() => {
    document.title = `Наброски (${sketches.length}) — The Attic`;
  }, [sketches.length]);

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setPaperType('parchment');
    setReadingTime(2);
    setImageUrl('');
    setContent('');
    setEditingId(null);
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
      setSketches((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      const newSketch = {
        ...payload,
        id: Date.now(),
        createdAt: new Date().toLocaleString('ru-RU')
      };
      setSketches((prev) => [newSketch, ...prev]);
    }

    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm("Удалить этот набросок с чердака?")) {
      setSketches((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
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

  const handleResetToDefault = () => {
    localStorage.removeItem('attic_sketches');
    setSketches(initialSketches);
    setSearchQuery('');
    setFilterPaper('all');
  };

  const totalReadingMinutes = sketches.reduce(
    (acc, item) => acc + (Number(item.readingTime) || 0),
    0
  );

  const filteredSketches = sketches
    .filter((sketch) => {
      const matchesPaper = filterPaper === 'all' || sketch.paperType === filterPaper;
      const matchesSearch =
        sketch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sketch.author.toLowerCase().includes(searchQuery.toLowerCase());
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
      <div className="stats-bar">
        <div className="stat-item">
          <span>Всего набросков:</span> <strong>{sketches.length}</strong>
        </div>
        <div className="stat-item">
          <span>Время чтения всех заметок:</span> <strong>~{totalReadingMinutes} мин</strong>
        </div>
        <div className="save-indicator">
          {saveStatus === 'Сохранение...' ? '⏳ Сохранение...' : '💾 Сохранено в localStorage'}
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="form-title">
          {editingId ? "✏️ Редактирование наброска" : "📜 Оставить набросок на чердаке"}
        </h2>

        <div className="form-group">
          <label>Заголовок наброска:</label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Старинные карманные часы"
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
              <option value="parchment">📜 Пергамент (золотистый)</option>
              <option value="kraft">📦 Крафт (древесный)</option>
              <option value="linen">🧵 Лён (пепельный)</option>
              <option value="pressed-flower">🌸 Сухоцвет (розовый)</option>
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
            {editingId ? "Сохранить изменения" : "Опубликовать набросок"}
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
          <label>🔍 Живой поиск:</label>
          <input
            type="text"
            className="form-control"
            placeholder="Поиск по названию или автору..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>📜 Фактура бумаги:</label>
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
          <label>⇅ Сортировка:</label>
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

      {isLoading ? (
        <div className="loader-box">
          <div className="candle-flicker">🕯️</div>
          <p style={{ marginTop: '15px' }}>Зажигаем свечи на чердаке...</p>
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
                {/* ЛОГИЧНЫЙ БЕЙДЖ: ВРЕМЯ ЧТЕНИЯ ВМЕСТО ПРОСМОТРОВ */}
                <span className="action-btn" title="Примерное время чтения">
                  ⏳ <span>{sketch.readingTime || 2} мин чтения</span>
                </span>

                <button
                  type="button"
                  className="action-btn"
                  onClick={() => handleStartEdit(sketch)}
                  title="Редактировать"
                >
                  ✏️ <span>Изменить</span>
                </button>

                <button
                  type="button"
                  className="action-btn btn-delete"
                  onClick={() => handleDelete(sketch.id)}
                  title="Удалить"
                >
                  🗑 <span>Удалить</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-message-full">
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
            Ни одного наброска по заданным критериям не найдено.
          </p>
          <p style={{ color: '#8c7c6f', fontSize: '0.9rem', marginBottom: '18px' }}>
            Возможно, активен фильтр или были удалены все записи.
          </p>
          <button type="button" className="btn-primary" onClick={handleResetToDefault}>
            🔄 Восстановить начальные наброски
          </button>
        </div>
      )}
    </div>
  );
}