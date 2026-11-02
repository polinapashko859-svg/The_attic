import { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import SketchList from './components/SketchList';
import SketchForm from './components/SketchForm';
import SketchDetail from './components/SketchDetail'; // Новый компонент
import { loginUser, registerUser } from './api';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <header className="main-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <svg className="quill-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
            </svg>
            <span className="logo-text">The Attic</span>
          </Link>

          <nav className="header-nav">
            <Link to="/" className="nav-link">Лента</Link>
            {user && <Link to="/create" className="nav-link">Написать</Link>}
          </nav>

          <div className="user-profile-menu">
            {user ? (
              <>
                <span className="user-avatar-mini">{user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}</span>
                <span className="user-email">{user.name || user.email}</span>
                <button onClick={handleLogout} className="btn-logout">Выйти</button>
              </>
            ) : (
              <Link to="/auth" className="btn-login">Войти</Link>
            )}
          </div>
        </div>
      </header>

      <main className="main-content-wide">
        <Routes>
          <Route path="/" element={<SketchList user={user} />} />
          <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthPage setUser={setUser} />} />
          <Route path="/create" element={user ? <SketchForm /> : <Navigate to="/auth" />} />
          {/* Страница просмотра и редактирования */}
          <Route path="/sketch/:id" element={<SketchDetail user={user} />} />
        </Routes>
      </main>
    </>
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

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
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