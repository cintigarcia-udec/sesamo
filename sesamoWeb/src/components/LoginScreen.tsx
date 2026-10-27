import React, { useState } from 'react';
import { getApiBaseUrl, login, parseJwt, setApiBaseUrl, setStoredToken } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  allowedRoleIds?: number[]; // Por defecto [1] (Admin)
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  allowedRoleIds = [1],
}) => {
  const [email, setEmail] = useState('admin@sesamo.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [apiUrl, setApiUrlState] = useState(getApiBaseUrl());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await login(email, password);
      const user = parseJwt(data.access_token);

      if (!user || !user.role_id || !allowedRoleIds.includes(user.role_id)) {
        setStoredToken(null);
        setError(
          `Acceso denegado: Tu usuario tiene rol ID ${user?.role_id ?? 'desconocido'}. Solo se permite acceso a Administradores (rol ID ${allowedRoleIds.join(', ')}).`
        );
        return;
      }

      onLoginSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl);
    setShowConfig(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-icon">🎓</span>
          <h1 className="brand-title">Sésamo Web</h1>
          <p className="brand-subtitle">Portal Administrativo · Carga Masiva</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-email">Correo Electrónico:</label>
            <input
              id="login-email"
              type="email"
              required
              autoFocus
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

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Validando credenciales...' : 'Ingresar al Portal'}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="config-link"
            onClick={() => setShowConfig(!showConfig)}
          >
            ⚙️ Configurar API ({apiUrl})
          </button>

          {showConfig && (
            <form onSubmit={handleSaveApiUrl} className="quick-config-form">
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrlState(e.target.value)}
                placeholder="http://127.0.0.1:8000"
              />
              <button type="submit" className="btn-secondary">
                Guardar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
