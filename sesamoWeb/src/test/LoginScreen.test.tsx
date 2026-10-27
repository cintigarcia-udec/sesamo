import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginScreen } from '../components/LoginScreen';
import * as api from '../services/api';

describe('<LoginScreen />', () => {
  const onLoginSuccessMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onLoginSuccessMock.mockClear();
    localStorage.clear();
  });

  const createFakeToken = (payload: Record<string, unknown>) => {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  it('renders login form elements with brand title and inputs', () => {
    render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

    expect(screen.getByText('Sésamo Web')).toBeInTheDocument();
    expect(screen.getByText(/Portal Administrativo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar al Portal/i })).toBeInTheDocument();
  });

  it('submits successfully for an admin user and calls onLoginSuccess', async () => {
    const adminToken = createFakeToken({
      sub: 'admin@sesamo.com',
      role_id: 1,
      name: 'Admin',
    });

    vi.spyOn(api, 'login').mockResolvedValue({
      access_token: adminToken,
      token_type: 'bearer',
    });

    render(<LoginScreen onLoginSuccess={onLoginSuccessMock} allowedRoleIds={[1]} />);

    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: 'admin@sesamo.com' },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Ingresar al Portal/i }));

    await waitFor(() => {
      expect(onLoginSuccessMock).toHaveBeenCalledTimes(1);
    });
  });

  it('blocks student (role_id: 2) from accessing and shows error banner', async () => {
    const studentToken = createFakeToken({
      sub: 'estudiante@sesamo.com',
      role_id: 2,
      name: 'Estudiante',
    });

    vi.spyOn(api, 'login').mockResolvedValue({
      access_token: studentToken,
      token_type: 'bearer',
    });

    render(<LoginScreen onLoginSuccess={onLoginSuccessMock} allowedRoleIds={[1]} />);

    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: 'estudiante@sesamo.com' },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: 'pass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Ingresar al Portal/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Acceso denegado: Tu usuario tiene rol ID 2/i)
      ).toBeInTheDocument();
    });

    expect(onLoginSuccessMock).not.toHaveBeenCalled();
    expect(api.getStoredToken()).toBeNull();
  });

  it('displays error banner when login API request fails', async () => {
    vi.spyOn(api, 'login').mockRejectedValue(new Error('Credenciales incorrectas'));

    render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: 'wrong-pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar al Portal/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
    });
    expect(onLoginSuccessMock).not.toHaveBeenCalled();
  });

  it('allows configuring and saving custom API base URL', () => {
    render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

    const configButton = screen.getByRole('button', { name: /Configurar API/i });
    fireEvent.click(configButton);

    const apiUrlInput = screen.getByPlaceholderText('http://127.0.0.1:8000');
    fireEvent.change(apiUrlInput, {
      target: { value: 'http://custom-api.example.com:9000' },
    });

    const saveButton = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.click(saveButton);

    expect(api.getApiBaseUrl()).toBe('http://custom-api.example.com:9000');
  });
});
