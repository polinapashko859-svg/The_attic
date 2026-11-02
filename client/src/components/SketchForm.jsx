import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addSketch } from '../api';

const PAPER_TYPES = [
  { value: 'parchment', label: '📜 Старинные хроники', hint: 'Здесь пишут о загадочных находках и историях из прошлого.' },
  { value: 'kraft', label: '🧭 Дневник странника', hint: 'Для рассказов о дорогах и приключениях.' },
  { value: 'linen', label: '☕ Уютные мысли', hint: 'Быт, рецепты и тёплые моменты.' },
  { value: 'pressed-flower', label: '🌸 Гербарий воспоминаний', hint: 'Личные истории, чувства и романтика.' }
];

export default function SketchForm() {
  const [title, setTitle] = useState('');
  const [paperType, setPaperType] = useState('parchment');
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 150;
    const words = text.trim().split(/\s+/).length;
    if (words === 0) return 0;
    return Math.ceil(words / wordsPerMinute);
  };
  
  const estimatedTime = calculateReadingTime(content);
  const currentHint = PAPER_TYPES.find(p => p.value === paperType)?.hint;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addSketch({
        title: title.trim(),
        paperType,
        readingTime: estimatedTime,
        imageUrl: imageUrl.trim() || null,
        content: content.trim()
      });
      navigate('/');
    } catch (err) {
      alert("Ошибка при создании наброска");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-card" onSubmit={handleSubmit} style={{ margin: '20px auto', maxWidth: '800px' }}>
      <h2 className="form-title">Оставить набросок в ветке</h2>
      
      <div className="form-group">
        <label>Заголовок:</label>
        <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="form-row-3col">
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Выберите ветку:</label>
          <select className="form-control" value={paperType} onChange={(e) => setPaperType(e.target.value)}>
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
        <input type="url" className="form-control" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Текст наброска:</label>
        <textarea rows="6" className="form-control" value={content} onChange={(e) => setContent(e.target.value)} required />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Сохранение..." : "Опубликовать"}
        </button>
      </div>
    </form>
  );
}