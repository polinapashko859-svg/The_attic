import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

const PAPER_TYPES = [
  { value: 'parchment', label: '📜 Старинные хроники', hint: 'Здесь пишут о загадочных находках и историях из прошлого.' },
  { value: 'kraft', label: '🧭 Дневник странника', hint: 'Для рассказов о дорогах и приключениях.' },
  { value: 'linen', label: '☕ Уютные мысли', hint: 'Быт, рецепты и тёплые моменты.' },
  { value: 'pressed-flower', label: '🌸 Гербарий воспоминаний', hint: 'Личные истории, чувства и романтика.' }
];

export default function SketchDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sketch, setSketch] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPaper, setEditPaper] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  useEffect(() => {
    fetchSketch();
  }, [id]);

  const fetchSketch = async () => {
    try {
      const res = await api.get(`/sketches/${id}`);
      setSketch(res.data);
      setEditTitle(res.data.title);
      setEditContent(res.data.content);
      setEditPaper(res.data.paperType);
      setEditImageUrl(res.data.imageUrl || '');
    } catch (err) {
      console.error(err);
      alert("Набросок не найден");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 150;
    const words = text.trim().split(/\s+/).length;
    if (words === 0) return 0;
    return Math.ceil(words / wordsPerMinute);
  };
  
  const estimatedTime = calculateReadingTime(editContent);
  const currentHint = PAPER_TYPES.find(p => p.value === editPaper)?.hint;


  const handleUpdate = async () => {
    const originalSketch = { ...sketch }; 

    
    setSketch({
      ...sketch,
      title: editTitle,
      content: editContent,
      paperType: editPaper,
      imageUrl: editImageUrl.trim() || null,
      readingTime: estimatedTime
    });
    setIsEditing(false);

    try {
      
      await api.put(`/sketches/${id}`, {
        title: editTitle,
        content: editContent,
        paperType: editPaper,
        readingTime: estimatedTime,
        imageUrl: editImageUrl.trim() || null
      });
    } catch (err) {
      
      setSketch(originalSketch);
      setIsEditing(true); 
      alert("Не удалось сохранить изменения. Вернули как было.");
    }
  };

  if (loading) return <div className="loader-box"><div className="candle-flicker">🕯️</div></div>;
  if (!sketch) return null;

  const isOwner = user && sketch.userId === user.id;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/" style={{ color: '#c89f6d', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Назад к ленте
      </Link>

      {isEditing ? (
        <form className="form-card" onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
          <h2 className="form-title">Редактирование наброска</h2>
          
          <div className="form-group">
            <label>Заголовок:</label>
            <input type="text" className="form-control" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
          </div>

          <div className="form-row-3col">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Выберите ветку:</label>
              <select className="form-control" value={editPaper} onChange={e => setEditPaper(e.target.value)}>
                {PAPER_TYPES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Время чтения (авто):</label>
              <input type="text" className="form-control" value={`${estimatedTime} мин`} disabled style={{ opacity: 0.7 }} />
            </div>
          </div>

          <p style={{ color: '#9c8978', fontSize: '0.9rem', marginBottom: '16px', fontStyle: 'italic' }}>
            {currentHint}
          </p>

          <div className="form-group">
            <label>Ссылка на фото:</label>
            <input type="url" className="form-control" value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Текст наброска:</label>
            <textarea rows="6" className="form-control" value={editContent} onChange={e => setEditContent(e.target.value)} required />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Сохранить</button>
            <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className={`sketch-card paper-card-${sketch.paperType}`} style={{ cursor: 'default' }}>
          <div className="card-header-user">
            <div className="author-avatar">{sketch.author[0].toUpperCase()}</div>
            <div className="author-info">
              <span className="author-name">{sketch.author}</span>
              <span className="post-time">{new Date(sketch.createdAt).toLocaleString('ru-RU')}</span>
            </div>
          </div>

          <h1 className="sketch-title" style={{ fontSize: '2.8rem' }}>{sketch.title}</h1>
          <p className="sketch-content" style={{ fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>{sketch.content}</p>
          
          {sketch.imageUrl && (
            <div className="sketch-image-wrapper">
              <img src={sketch.imageUrl} alt={sketch.title} />
            </div>
          )}

          <div className="card-actions-bar">
            <span className="action-time">⏳ {sketch.readingTime || 2} мин</span>
            {isOwner && (
              <button className="btn-cancel" onClick={() => setIsEditing(true)} style={{ marginLeft: 'auto' }}>
                Редактировать
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}