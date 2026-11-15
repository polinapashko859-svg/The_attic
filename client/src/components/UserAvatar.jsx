import { useState } from 'react';

export default function UserAvatar({ user, className = 'user-avatar-mini' }) {
  const [failedUrl, setFailedUrl] = useState('');
  const avatarUrl = typeof user?.avatarUrl === 'string' ? user.avatarUrl : '';
  const label = (user?.name || user?.email || 'Аноним').trim();
  const showPhoto = avatarUrl && failedUrl !== avatarUrl;

  return (
    <span className={`${className}${showPhoto ? ' has-photo' : ''}`} aria-label={label}>
      {showPhoto ? (
        <img src={avatarUrl} alt="" onError={() => setFailedUrl(avatarUrl)} />
      ) : (
        label[0]?.toLocaleUpperCase('ru-RU') || 'А'
      )}
    </span>
  );
}
