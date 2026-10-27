import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import * as api from '../../services/api';

describe('SYSTEM TEST: Ciclo Completo de Autenticación, RBAC y Salida en Sésamo Web', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'getCategories').mockResolvedValue([]);
    vi.spyOn(api, 'getQuestionnaires').mockResolvedValue([]);
  });

  const createJwtToken = (roleId: number, email: string) => {
    const payload = {
      sub: email,
      role_id: roleId,
      name: roleId === 1 ? 'Administrador' : 'Estudiante',
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  it('flujo end-to-end: bloqueo de estudiante -> ingreso de administrador -> acceso a dashboard -> logout', async () => {
    // 1. Inicialmente se renderiza la pantalla de login (sin token previo)
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sésamo Web' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar al Portal/i })).toBeInTheDocument();
    expect(screen.queryByText(/Módulo de Carga Masiva/i)).not.toBeInTheDocument();

    // 2. Intento de acceso de un estudiante (rol 2)
    const studentToken = createJwtToken(2, 'alumno@sesamo.com');
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: studentToken, token_type: 'bearer' }),
    });

    const emailInput = screen.getByLabelText(/Correo Electrónico/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /Ingresar al Portal/i });

    fireEvent.change(emailInput, { target: { value: 'alumno@sesamo.com' } });
    fireEvent.change(passwordInput, { target: { value: 'claveEstudiante123' } });
    fireEvent.click(submitBtn);

    // Se verifica el bloqueo RBAC con alerta en pantalla y purga de token
    await waitFor(() => {
      expect(screen.getByText(/Acceso denegado: Tu usuario tiene rol ID 2/i)).toBeInTheDocument();
    });
    expect(api.getStoredToken()).toBeNull();
    expect(screen.queryByText(/Módulo de Carga Masiva/i)).not.toBeInTheDocument();

    // 3. Ingreso exitoso de un Administrador (rol 1)
    const adminToken = createJwtToken(1, 'admin@sesamo.com');
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: adminToken, token_type: 'bearer' }),
    });

    fireEvent.change(emailInput, { target: { value: 'admin@sesamo.com' } });
    fireEvent.change(passwordInput, { target: { value: 'AdminPass2026!' } });
    fireEvent.click(submitBtn);

    // La aplicación conmuta su estado global y despliega el panel administrativo
    expect(await screen.findByText('🛡️ Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@sesamo.com')).toBeInTheDocument();
    expect(screen.getByText(/Módulo de Carga Masiva/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preguntas y Respuestas/i })).toBeInTheDocument();

    // 4. Administrador cierra sesión desde la barra superior
    const logoutBtn = screen.getByRole('button', { name: /Salir/i });
    fireEvent.click(logoutBtn);

    // El sistema purga el token de localStorage y regresa inmediatamente al LoginScreen
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ingresar al Portal/i })).toBeInTheDocument();
    });
    expect(api.getStoredToken()).toBeNull();
    expect(screen.queryByText('🛡️ Admin')).not.toBeInTheDocument();
    expect(screen.queryByText(/Módulo de Carga Masiva/i)).not.toBeInTheDocument();
  });
});
