import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import SketchDiscussion from './SketchDiscussion';
import { normalizeSketchBranch, SKETCH_BRANCHES } from '../constants/sketchBranches';
import UserAvatar from './UserAvatar';
import {
  CONTENT_MAX_LENGTH,
  CONTENT_MIN_LENGTH,
  IMAGE_URL_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH
} from '../constants/sketchLimits';

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
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const loadSketch = async () => {
      try {
        const res = await api.get(`/sketches/${id}`, { signal: controller.signal });
        setSketch(res.data);
        setEditTitle(res.data.title);
        setEditContent(res.data.content);
        setEditPaper(normalizeSketchBranch(res.data.paperType));
        setEditImageUrl(res.data.imageUrl || '');
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          alert("Набросок не найден");
          navigate('/');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadSketch();
    return () => controller.abort();
  }, [id, navigate]);

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 150;
    const words = text.trim().split(/\s+/).length;
    if (words === 0) return 0;
    return Math.ceil(words / wordsPerMinute);
  };
  
  const estimatedTime = calculateReadingTime(editContent);
  const currentBranch = SKETCH_BRANCHES.find(branch => branch.value === editPaper);


  const handleUpdate = async () => {
    if (editTitle.trim().length < TITLE_MIN_LENGTH || editTitle.trim().length > TITLE_MAX_LENGTH) {
      setEditError(`Заголовок должен содержать от ${TITLE_MIN_LENGTH} до ${TITLE_MAX_LENGTH} символов.`);
      return;
    }
    if (editContent.trim().length < CONTENT_MIN_LENGTH || editContent.trim().length > CONTENT_MAX_LENGTH) {
      setEditError(`Текст должен содержать от ${CONTENT_MIN_LENGTH} до ${CONTENT_MAX_LENGTH} символов.`);
      return;
    }

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
    setEditError('');

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
      setEditError(err.response?.data?.error || "Не удалось сохранить изменения. Попробуйте ещё раз.");
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
          {editError && <p className="form-error" role="alert">{editError}</p>}
          
          <div className="form-group">
            <label>Заголовок:</label>
            <input
              type="text"
              className="form-control"
              value={editTitle}
              onChange={e => { setEditTitle(e.target.value); setEditError(''); }}
              minLength={TITLE_MIN_LENGTH}
              maxLength={TITLE_MAX_LENGTH}
              required
            />
            <span className="field-hint">{editTitle.length}/{TITLE_MAX_LENGTH} символов</span>
          </div>

          <div className="form-row-3col">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Выберите ветку:</label>
              <select className="form-control" value={editPaper} onChange={e => setEditPaper(e.target.value)}>
                {SKETCH_BRANCHES.map(branch => (
                  <option key={branch.value} value={branch.value}>{branch.icon} {branch.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Время чтения (авто):</label>
              <input type="text" className="form-control" value={`${estimatedTime} мин`} disabled style={{ opacity: 0.7 }} />
            </div>
          </div>

          <p style={{ color: '#9c8978', fontSize: '0.9rem', marginBottom: '16px', fontStyle: 'italic' }}>
            {currentBranch?.hint}
          </p>

          <div className="form-group">
            <label>Ссылка на фото:</label>
            <input
              type="url"
              className="form-control"
              value={editImageUrl}
              onChange={e => setEditImageUrl(e.target.value)}
              maxLength={IMAGE_URL_MAX_LENGTH}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label>Текст наброска:</label>
            <textarea
              rows="6"
              className="form-control"
              value={editContent}
              onChange={e => { setEditContent(e.target.value); setEditError(''); }}
              minLength={CONTENT_MIN_LENGTH}
              maxLength={CONTENT_MAX_LENGTH}
              required
            />
            <span className="field-hint">{editContent.length}/{CONTENT_MAX_LENGTH} символов</span>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Сохранить</button>
            <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className={`sketch-card paper-card-${normalizeSketchBranch(sketch.paperType)}`} style={{ cursor: 'default' }}>
          <div className="card-header-user">
            {sketch.userId ? (
              <Link to={`/users/${sketch.userId}`} className="author-profile-link">
                <UserAvatar user={{ name: sketch.user?.name || sketch.author, avatarUrl: sketch.user?.avatarUrl }} className="author-avatar" />
                <span className="author-info">
                  <span className="author-name">{sketch.user?.name || sketch.author}</span>
                  <span className="post-time">{new Date(sketch.createdAt).toLocaleString('ru-RU')}</span>
                </span>
              </Link>
            ) : (
              <>
                <UserAvatar user={{ name: sketch.author }} className="author-avatar" />
                <div className="author-info">
                  <span className="author-name">{sketch.author}</span>
                  <span className="post-time">{new Date(sketch.createdAt).toLocaleString('ru-RU')}</span>
                </div>
              </>
            )}
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

      {!isEditing && <SketchDiscussion key={id} sketchId={id} user={user} />}
    </div>
  );
}