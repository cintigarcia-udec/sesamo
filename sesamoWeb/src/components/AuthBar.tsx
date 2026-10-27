import React, { useState } from 'react';
import {
  getApiBaseUrl,
  getStoredToken,
  login,
  parseJwt,
  setApiBaseUrl,
  setStoredToken,
} from '../services/api';

interface AuthBarProps {
  onAuthChange: () => void;
}

export const AuthBar: React.FC<AuthBarProps> = ({ onAuthChange }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const [apiUrl, setApiUrlState] = useState(getApiBaseUrl());
  const [email, setEmail] = useState('admin@sesamo.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = getStoredToken();
  const userData = token ? parseJwt(token) : null;
  const isAdmin = userData?.role_id === 1;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      setShowLoginModal(false);
      setPassword('');
      onAuthChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    onAuthChange();
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl);
    setShowConfigModal(false);
    onAuthChange();
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="logo-badge">🎓</span>
        <div>
          <h1 className="header-title">Sésamo Web</h1>
          <p className="header-subtitle">Módulo de Carga Masiva (CSV / XLSX)</p>
        </div>
      </div>

      <div className="header-right">
        <button
          type="button"
          className="btn-icon"
          title="Configurar URL del Backend"
          onClick={() => setShowConfigModal(true)}
        >
          ⚙️ <span className="api-badge">{apiUrl}</span>
        </button>

        {token && userData ? (
          <div className="user-profile">
            <span className={`role-badge ${isAdmin ? 'admin' : 'student'}`}>
              {isAdmin ? '🛡️ Admin' : '👤 Estudiante'}
            </span>
            <span className="user-email">{userData.email}</span>
            <button type="button" className="btn-secondary" onClick={handleLogout}>
              Salir
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowLoginModal(true)}
          >
            🔑 Iniciar Sesión (Admin)
          </button>
        )}
      </div>

      {/* Modal de Login */}
      {showLoginModal && (
        <div className="modal-backdrop" onClick={() => setShowLoginModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Autenticación Administrativa</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowLoginModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleLogin} className="modal-form">
              <p className="modal-hint">
                Para registrar preguntas, opciones y cuestionarios se requiere un token
                con privilegios de Administrador.
              </p>
              {error && <div className="error-banner">{error}</div>}
              <div className="form-group">
                <label htmlFor="login-email">Correo Electrónico:</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sesamo.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Contraseña:</label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLoginModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Verificando...' : 'Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuración API */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configuración de la API</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowConfigModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveApiUrl} className="modal-form">
              <div className="form-group">
                <label htmlFor="api-url">URL Base de FastAPI:</label>
                <input
                  id="api-url"
                  type="url"
                  required
                  value={apiUrl}
                  onChange={(e) => setApiUrlState(e.target.value)}
                  placeholder="http://127.0.0.1:8000"
                />
                <span className="field-hint">
                  Por defecto en local: <code>http://127.0.0.1:8000</code>
                </span>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowConfigModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
