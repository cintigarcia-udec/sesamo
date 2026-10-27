import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginScreen } from '../../components/LoginScreen';
import * as api from '../../services/api';

describe('USABILITY TEST: Accesibilidad de Formularios y Heurísticas de Entrada (WCAG 2.1 AA / Nielsen 1 & 9)', () => {
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

  describe('Accesibilidad Semántica de Campos (WCAG 2.1 AA)', () => {
    it('vincula explícitamente etiquetas <label> con controles de entrada mediante htmlFor e id', () => {
      render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

      const emailInput = screen.getByLabelText(/Correo Electrónico:/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('id', 'login-email');

      const passwordInput = screen.getByLabelText(/Contraseña:/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('id', 'login-password');
    });

    it('utiliza tipos de entrada HTML5 y atributos de validación nativos del navegador', () => {
      render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

      const emailInput = screen.getByLabelText(/Correo Electrónico:/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
      expect(emailInput).toHaveAttribute('placeholder', 'admin@sesamo.com');

      const passwordInput = screen.getByLabelText(/Contraseña:/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toBeRequired();
      expect(passwordInput).toHaveAttribute('placeholder', '••••••••');
    });
  });

  describe('Heurística 1: Visibilidad del Estado del Sistema durante la Autenticación', () => {
    it('comunica el estado de validación y bloquea el botón para evitar doble envío accidental', async () => {
      let resolveLogin: (val: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      vi.spyOn(api, 'login').mockReturnValue(pendingPromise as any);

      render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

      // Completar campos requeridos
      fireEvent.change(screen.getByLabelText(/Contraseña:/i), {
        target: { value: 'secreto123' },
      });

      const submitBtn = screen.getByRole('button', { name: /Ingresar al Portal/i });
      expect(submitBtn).toBeEnabled();

      // Enviar formulario
      fireEvent.click(submitBtn);

      // El botón debe reflejar el estado asíncrono y quedar inhabilitado
      expect(screen.getByRole('button', { name: /Validando credenciales.../i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Validando credenciales.../i })).toBeDisabled();

      // Completar login para limpiar
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      resolveLogin!({ access_token: adminToken, token_type: 'bearer' });

      await waitFor(() => {
        expect(onLoginSuccessMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Heurística 9: Diagnóstico y Recuperación de Errores (Mensajes Constructivos)', () => {
    it('explica de forma clara el motivo de bloqueo por RBAC indicando roles permitidos', async () => {
      const studentToken = createFakeToken({
        sub: 'estudiante@sesamo.com',
        role_id: 2,
      });

      vi.spyOn(api, 'login').mockResolvedValue({
        access_token: studentToken,
        token_type: 'bearer',
      });

      render(<LoginScreen onLoginSuccess={onLoginSuccessMock} allowedRoleIds={[1]} />);

      fireEvent.change(screen.getByLabelText(/Contraseña:/i), {
        target: { value: 'claveEstudiante' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Ingresar al Portal/i }));

      await waitFor(() => {
        const errorBanner = screen.getByText(/Acceso denegado: Tu usuario tiene rol ID 2/i);
        expect(errorBanner).toBeInTheDocument();
        expect(errorBanner.textContent).toContain('Solo se permite acceso a Administradores (rol ID 1)');
      });

      // No debe avanzar a la aplicación
      expect(onLoginSuccessMock).not.toHaveBeenCalled();
    });
  });

  describe('Control y Libertad del Usuario: Configuración Rápida de Endpoint', () => {
    it('permite desplegar el configurador de API sin abandonar la pantalla de ingreso', () => {
      render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

      const configTrigger = screen.getByRole('button', { name: /Configurar API/i });
      expect(screen.queryByPlaceholderText('http://127.0.0.1:8000')).not.toBeInTheDocument();

      // Clic para desplegar
      fireEvent.click(configTrigger);
      const urlInput = screen.getByPlaceholderText('http://127.0.0.1:8000');
      expect(urlInput).toBeInTheDocument();
      expect(urlInput).toHaveAttribute('type', 'url');

      const saveBtn = screen.getByRole('button', { name: /Guardar/i });
      expect(saveBtn).toBeInTheDocument();
    });
  });
});
