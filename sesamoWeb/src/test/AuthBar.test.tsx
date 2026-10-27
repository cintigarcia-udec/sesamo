import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthBar } from '../components/AuthBar';
import * as api from '../services/api';

describe('<AuthBar />', () => {
  const onAuthChangeMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onAuthChangeMock.mockClear();
    localStorage.clear();
  });

  const createFakeToken = (payload: Record<string, unknown>) => {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  it('renders login button when unauthenticated', () => {
    render(<AuthBar onAuthChange={onAuthChangeMock} />);

    expect(screen.getByText(/Sésamo Web/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Sesión \(Admin\)/i })).toBeInTheDocument();
  });

  it('renders user email and admin badge when authenticated as Admin', () => {
    const token = createFakeToken({
      sub: 'admin@sesamo.com',
      role_id: 1,
    });
    vi.spyOn(api, 'getStoredToken').mockReturnValue(token);

    render(<AuthBar onAuthChange={onAuthChangeMock} />);

    expect(screen.getByText('🛡️ Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@sesamo.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salir/i })).toBeInTheDocument();
  });

  it('clears token and notifies onAuthChange when logout button is clicked', () => {
    const token = createFakeToken({
      sub: 'admin@sesamo.com',
      role_id: 1,
    });
    vi.spyOn(api, 'getStoredToken').mockReturnValue(token);
    const setStoredTokenSpy = vi.spyOn(api, 'setStoredToken');

    render(<AuthBar onAuthChange={onAuthChangeMock} />);

    const logoutButton = screen.getByRole('button', { name: /Salir/i });
    fireEvent.click(logoutButton);

    expect(setStoredTokenSpy).toHaveBeenCalledWith(null);
    expect(onAuthChangeMock).toHaveBeenCalledTimes(1);
  });

  it('opens config modal and saves new API URL', () => {
    const setApiBaseUrlSpy = vi.spyOn(api, 'setApiBaseUrl');

    render(<AuthBar onAuthChange={onAuthChangeMock} />);

    const configBtn = screen.getByTitle('Configurar URL del Backend');
    fireEvent.click(configBtn);

    expect(screen.getByText('Configuración de la API')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('http://127.0.0.1:8000');
    fireEvent.change(input, {
      target: { value: 'https://backend.production.com' },
    });

    const saveBtn = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.click(saveBtn);

    expect(setApiBaseUrlSpy).toHaveBeenCalledWith('https://backend.production.com');
    expect(onAuthChangeMock).toHaveBeenCalledTimes(1);
  });
});
