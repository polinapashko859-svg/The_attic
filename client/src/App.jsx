import SketchList from './components/SketchList';
import './index.css';

export default function App() {
  return (
    <>

      <header className="main-header">
        <div className="header-container">
          <div className="logo">
            <svg className="quill-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
              <line x1="16" y1="8" x2="2" y2="22" />
              <line x1="17.5" y1="15" x2="9" y2="15" />
            </svg>
            <span className="logo-text">The Attic</span>
          </div>

          <div className="user-chip">
            <span className="user-avatar-mini">П</span>
            <span>Полина (Автор Чердака)</span>
          </div>
        </div>
      </header>

      <main className="container">
        <h1 className="page-title">Уютная лента набросков</h1>
        <p className="page-subtitle">Клиентское React-приложение с управлением состоянием и localStorage</p>
        
        <SketchList />
      </main>
    </>
  );
}