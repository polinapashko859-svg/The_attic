import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicProfile } from '../api';
import ProfileSketches from './ProfileSketches';
import UserAvatar from './UserAvatar';

export default function PublicProfilePage({ currentUser }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [sketches, setSketches] = useState([]);
  const [loadedId, setLoadedId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetchPublicProfile(id, { signal: controller.signal })
      .then(({ data }) => {
        setProfile(data.user);
        setSketches(data.sketches);
        setError('');
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError.response?.data?.error || 'Не удалось загрузить профиль.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedId(id);
      });

    return () => controller.abort();
  }, [id]);

  if (loadedId !== id) return <div className="loader-box"><div className="candle-flicker">🕯️</div></div>;
  if (error || !profile) {
    return (
      <section className="profile-not-found">
        <p className="form-error" role="alert">{error || 'Профиль недоступен.'}</p>
        <Link to="/" className="profile-back-link">Вернуться к ленте</Link>
      </section>
    );
  }

  const isOwnProfile = Number(currentUser?.id) === Number(profile.id);

  return (
    <main className="profile-page public-profile-page">
      <Link to="/" className="profile-back-link">← К ленте</Link>
      <header className="profile-hero">
        <UserAvatar user={profile} className="profile-avatar" />
        <div className="profile-hero-copy">
          <span className="profile-kicker">АВТОР ЧЕРДАКА</span>
          <h1>{profile.name || 'Обитатель чердака'}</h1>
          <p>{profile.bio || 'Этот автор пока не добавил подпись профиля.'}</p>
        </div>
        <div className="profile-hero-actions">
          <div className="profile-stat">
            <strong>{sketches.length}</strong>
            <span>публикаций</span>
          </div>
          {isOwnProfile ? (
            <Link to="/profile" className="btn-primary">Редактировать</Link>
          ) : currentUser ? (
            <Link to={`/messages?userId=${encodeURIComponent(profile.id)}`} className="btn-primary">
              Написать автору
            </Link>
          ) : (
            <Link to="/auth" className="btn-primary">Войти, чтобы написать</Link>
          )}
        </div>
      </header>

      <section className="profile-publications">
        <div className="profile-section-heading">
          <span className="profile-kicker">ИЗ АРХИВА АВТОРА</span>
          <h2>Публикации</h2>
        </div>
        <ProfileSketches
          sketches={sketches}
          emptyMessage="У этого автора пока нет опубликованных набросков."
        />
      </section>
    </main>
  );
}
