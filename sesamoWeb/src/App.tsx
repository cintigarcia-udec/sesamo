import { useState } from 'react';
import { AuthBar } from './components/AuthBar';
import { BulkUploader } from './components/BulkUploader';
import { LoginScreen } from './components/LoginScreen';
import { getStoredToken, parseJwt } from './services/api';
import './App.css';

// Roles autorizados para el portal administrativo (por defecto rol ID 1 = Admin)
const ALLOWED_ROLE_IDS = [1];

function App() {
  const [authKey, setAuthKey] = useState(0);

  const token = getStoredToken();
  const user = token ? parseJwt(token) : null;
  const isAuthenticated = Boolean(user && user.role_id && ALLOWED_ROLE_IDS.includes(user.role_id));

  const handleAuthChange = () => {
    setAuthKey((prev) => prev + 1);
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={handleAuthChange}
        allowedRoleIds={ALLOWED_ROLE_IDS}
      />
    );
  }

  return (
    <div className="app-root">
      <AuthBar onAuthChange={handleAuthChange} />
      <main className="main-content">
        <BulkUploader authKey={authKey} />
      </main>
    </div>
  );
}

export default App;
