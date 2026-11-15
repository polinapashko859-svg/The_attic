export function readSessionUser() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');

  const savedUser = sessionStorage.getItem('user');
  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(user, token) {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
}

export function saveSessionUser(user) {
  sessionStorage.setItem('user', JSON.stringify(user));
}

export function getSessionToken() {
  return sessionStorage.getItem('token');
}

export function clearSession() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
