import { useEffect, useState } from 'react';
import { fetchProfile, updateProfile } from '../api';
import ProfileSketches from './ProfileSketches';
import UserAvatar from './UserAvatar';
import { saveSessionUser } from '../authStorage';

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const EMAIL_MAX_LENGTH = 254;
const BIO_MAX_LENGTH = 500;
const AVATAR_URL_MAX_LENGTH = 2048;
const LOCAL_AVATAR_PATTERN = /^\/avatars\/[a-z0-9_-]+\.(svg|png|jpe?g|webp)$/i;

function isValidAvatarUrl(value) {
  if (!value) return true;
  if (LOCAL_AVATAR_PATTERN.test(value)) return true;

  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export default function ProfilePage({ onUpdated }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    fetchProfile()
      .then(({ data }) => {
        if (!active) return;
        const { sketches = [], ...profileData } = data;
        setProfile({ ...profileData, sketches });
        setName(profileData.name || '');
        setEmail(profileData.email || '');
        setBio(profileData.bio || '');
        setAvatarUrl(profileData.avatarUrl || '');
        saveSessionUser(profileData);
        onUpdated(profileData);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.error || 'Не удалось загрузить профиль.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [onUpdated]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedBio = bio.trim();
    const trimmedAvatarUrl = avatarUrl.trim();

    if (trimmedName.length < NAME_MIN_LENGTH || trimmedName.length > NAME_MAX_LENGTH) {
      setError(`Имя должно содержать от ${NAME_MIN_LENGTH} до ${NAME_MAX_LENGTH} символов.`);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > EMAIL_MAX_LENGTH) {
      setError('Введите корректный email.');
      return;
    }
    if (trimmedBio.length > BIO_MAX_LENGTH) {
      setError(`Описание не должно превышать ${BIO_MAX_LENGTH} символов.`);
      return;
    }
    if (trimmedAvatarUrl.length > AVATAR_URL_MAX_LENGTH || !isValidAvatarUrl(trimmedAvatarUrl)) {
      setError('Укажите ссылку на изображение HTTP(S) или выберите готовый аватар.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        bio: trimmedBio,
        avatarUrl: trimmedAvatarUrl
      });
      saveSessionUser(data);
      onUpdated(data);
      setProfile((current) => ({ ...current, ...data }));
      setName(data.name);
      setEmail(data.email);
      setBio(data.bio || '');
      setAvatarUrl(data.avatarUrl || '');
      setSuccess('Профиль сохранён.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Не удалось сохранить профиль.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loader-box"><div className="candle-flicker">🕯️</div></div>;
  if (!profile) {
    return <p className="form-error profile-load-error" role="alert">{error || 'Профиль недоступен.'}</p>;
  }

  const sketches = profile.sketches || [];

  return (
    <main className="profile-page">
      <header className="profile-hero">
        <UserAvatar user={{ name, avatarUrl }} className="profile-avatar" />
        <div className="profile-hero-copy">
          <span className="profile-kicker">ЛИЧНОЕ ДЕЛО</span>
          <h1>{name || 'Мой профиль'}</h1>
          <p>{bio || 'Расскажите об интересах, историях и том, что вы находите на чердаке.'}</p>
        </div>
        <div className="profile-stat">
          <strong>{sketches.length}</strong>
          <span>публикаций</span>
        </div>
      </header>

      <div className="profile-content-grid">
        <section className="profile-editor">
          <div className="profile-section-heading">
            <span className="profile-kicker">НАСТРОЙКИ</span>
            <h2>О себе</h2>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="profile-name">Имя</label>
              <input
                id="profile-name"
                className="form-control"
                value={name}
                onChange={(event) => { setName(event.target.value); setError(''); setSuccess(''); }}
                minLength={NAME_MIN_LENGTH}
                maxLength={NAME_MAX_LENGTH}
                autoComplete="name"
                required
              />
              <span className="field-hint">{name.length}/{NAME_MAX_LENGTH}</span>
            </div>
            <div className="form-group">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setError(''); setSuccess(''); }}
                maxLength={EMAIL_MAX_LENGTH}
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="profile-bio">Подпись профиля</label>
              <textarea
                id="profile-bio"
                className="form-control"
                rows="4"
                value={bio}
                onChange={(event) => { setBio(event.target.value); setError(''); setSuccess(''); }}
                maxLength={BIO_MAX_LENGTH}
                placeholder="Пара слов о себе и своих историях..."
              />
              <span className="field-hint">{bio.length}/{BIO_MAX_LENGTH}</span>
            </div>
            <div className="form-group">
              <label htmlFor="profile-avatar">Ссылка на фото профиля</label>
              <input
                id="profile-avatar"
                type="text"
                inputMode="url"
                className="form-control"
                value={avatarUrl}
                onChange={(event) => { setAvatarUrl(event.target.value); setError(''); setSuccess(''); }}
                maxLength={AVATAR_URL_MAX_LENGTH}
                placeholder="https://... или /avatars/anna.svg"
              />
              <span className="field-hint">Можно указать ссылку на изображение или оставить поле пустым.</span>
            </div>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить профиль'}
            </button>
          </form>
        </section>

        <section className="profile-publications">
          <div className="profile-section-heading">
            <span className="profile-kicker">АРХИВ АВТОРА</span>
            <h2>Мои публикации</h2>
          </div>
          <ProfileSketches
            sketches={sketches}
            emptyMessage="Пока нет публикаций. Первая история может начаться с одного наброска."
          />
        </section>
      </div>
    </main>
  );
}
