import { useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import SketchList from './components/SketchList';
import SketchDetail from './components/SketchDetail';
import MessagesPage from './components/MessagesPage';
import ProfilePage from './components/ProfilePage';
import PublicProfilePage from './components/PublicProfilePage';
import UserAvatar from './components/UserAvatar';
import { loginUser, registerUser } from './api';
import { clearSession, readSessionUser, saveSession } from './authStorage';
import './index.css';

export default function App() {
  const [user, setUser] = useState(readSessionUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="app-layout">
      <header className="main-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <svg className="quill-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
              <line x1="16" y1="8" x2="2" y2="22" />
              <line x1="17.5" y1="15" x2="9" y2="15" />
            </svg>
            <span className="logo-text">The Attic</span>
          </Link>

          <button
            type="button"
            className={`menu-toggle ${isMenuOpen ? 'is-open' : ''}`}
            aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`header-menu ${isMenuOpen ? 'is-open' : ''}`} id="primary-navigation">
            <nav className="header-nav">
              <Link to="/" className="nav-link" onClick={() => setIsMenuOpen(false)}>Лента</Link>
              {user && (
                <Link to="/messages" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                  Сообщения
                </Link>
              )}
            </nav>

            <div className="user-profile-menu">
              {user ? (
                <>
                  <Link to="/profile" className="user-info" aria-label="Открыть свой профиль" onClick={() => setIsMenuOpen(false)}>
                    <UserAvatar user={user} />
                    <span className="user-email">{user.name || user.email}</span>
                  </Link>
                  <button onClick={handleLogout} className="btn-logout">Выйти</button>
                </>
              ) : (
                <Link to="/auth" className="btn-login" onClick={() => setIsMenuOpen(false)}>Войти</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content-wide">
        <Routes>
          <Route path="/" element={<SketchList user={user} />} />
          <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthPage setUser={setUser} />} />
          <Route path="/sketch/:id" element={<SketchDetail user={user} />} />
          <Route path="/users/:id" element={<PublicProfilePage currentUser={user} />} />
          <Route path="/messages" element={user ? <MessagesPage user={user} /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={user ? <ProfilePage onUpdated={setUser} /> : <Navigate to="/auth" />} />
        </Routes>
      </main>

      <footer className="main-footer">
        <div className="footer-container">
          <div className="footer-left">
            <span className="footer-logo">The Attic</span>
            <span className="footer-copy">© 2026. Уютное место для ваших мыслей.</span>
          </div>
          <div className="footer-right">
            <span>Сделано с 🕯️ и любовью к винтажу</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AuthPage({ setUser }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); 
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const response = isLoginView 
        ? await loginUser({ email, password })
        : await registerUser({ email, password, name });
      
      if (!isLoginView) {
        setIsLoginView(true);
        setAuthError('Регистрация успешна! Теперь войдите.');
        return;
      }

      saveSession(response.data.user, response.data.token);
      setUser(response.data.user);
      navigate('/');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Ошибка авторизации.');
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="form-card auth-card" onSubmit={handleAuth}>
        <h2 className="form-title">{isLoginView ? "Вход на Чердак" : "Регистрация"}</h2>
        {authError && <p className="auth-error">{authError}</p>}
        
        {!isLoginView && (
          <div className="form-group">
            <label>Ваше имя:</label>
            <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="form-group">
          <label>Email:</label>
          <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Пароль:</label>
          <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn-primary">{isLoginView ? "Войти" : "Зарегистрироваться"}</button>
          <button type="button" className="btn-cancel" onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? "Создать аккаунт" : "У меня есть аккаунт"}
          </button>
        </div>
      </form>
    </div>
  );
}