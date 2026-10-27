import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../../app/auth/login';
import ProfileScreen from '../../app/(tabs)/profile';
import {
  ApiError,
  api,
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../../constants/api';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  };
});

describe('SYSTEM TEST: Ciclo de Autenticación, Enrutamiento RBAC y Cierre de Sesión', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStoredAccessToken();
  });

  const createJwtWithRole = (role: number | string, userId: number = 42) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'usuario@sesamo.com',
        user_id: userId,
        role_id: role,
        name: 'Estudiante',
        last_name: 'Prueba',
      })
    ).toString('base64');
    return `${header}.${payload}.sig`;
  };

  it('valida formato de correo y deshabilita el botón si los campos son inválidos', () => {
    render(<LoginScreen />);

    const submitBtn = screen.getByLabelText('Botón de Iniciar Sesión');
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);

    const emailInput = screen.getByPlaceholderText('ejemplo@correo.com');
    fireEvent.changeText(emailInput, 'correo-invalido-sin-arroba');

    expect(screen.getByText('Formato de correo inválido.')).toBeTruthy();
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(emailInput, 'valido@sesamo.com');
    expect(screen.queryByText('Formato de correo inválido.')).toBeNull();
  });

  it('procesa rechazo de autenticación del backend (401) mostrando mensaje de credenciales incorrectas', async () => {
    jest.spyOn(api.auth, 'login').mockRejectedValue(
      new ApiError({
        kind: 'unauthorized',
        status: 401,
        message: 'Correo o contraseña incorrectos.',
      })
    );

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('ejemplo@correo.com'), 'alumno@sesamo.com');
    fireEvent.changeText(screen.getByPlaceholderText('********'), 'claveErronea123');
    fireEvent.press(screen.getByLabelText('Botón de Iniciar Sesión'));

    await waitFor(() => {
      expect(screen.getByText('Correo o contraseña incorrectos.')).toBeTruthy();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('flujo exitoso de Estudiante (rol 2): guarda token y despacha a /(tabs)', async () => {
    const studentToken = createJwtWithRole(2, 101);
    jest.spyOn(api.auth, 'login').mockResolvedValue({
      access_token: studentToken,
      token_type: 'bearer',
    } as any);

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('ejemplo@correo.com'), 'estudiante@sesamo.com');
    fireEvent.changeText(screen.getByPlaceholderText('********'), 'PasswordSeguro1!');
    fireEvent.press(screen.getByLabelText('Botón de Iniciar Sesión'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });

    const storedToken = await getStoredAccessToken();
    expect(storedToken).toBe(studentToken);
  });

  it('flujo exitoso de Administrador (rol 1): guarda token y despacha a /admin', async () => {
    const adminToken = createJwtWithRole(1, 1);
    jest.spyOn(api.auth, 'login').mockResolvedValue({
      access_token: adminToken,
      token_type: 'bearer',
    } as any);

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('ejemplo@correo.com'), 'admin@sesamo.com');
    fireEvent.changeText(screen.getByPlaceholderText('********'), 'AdminPass2026!');
    fireEvent.press(screen.getByLabelText('Botón de Iniciar Sesión'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin');
    });
  });

  it('flujo exitoso de Docente (rol 3): guarda token y despacha a /admin/questionnaires', async () => {
    const teacherToken = createJwtWithRole(3, 202);
    jest.spyOn(api.auth, 'login').mockResolvedValue({
      access_token: teacherToken,
      token_type: 'bearer',
    } as any);

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('ejemplo@correo.com'), 'docente@sesamo.com');
    fireEvent.changeText(screen.getByPlaceholderText('********'), 'DocentePass1!');
    fireEvent.press(screen.getByLabelText('Botón de Iniciar Sesión'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/questionnaires');
    });
  });

  it('cierre de sesión desde ProfileScreen: purga tokens y redirige a /auth/login', async () => {
    await setStoredAccessToken(createJwtWithRole(2));
    jest.spyOn(api.auth, 'logout').mockResolvedValue(undefined as any);

    render(<ProfileScreen />);

    const logoutBtn = await screen.findByLabelText('Cerrar sesión');
    fireEvent.press(logoutBtn);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/auth/login');
    });

    const storedToken = await getStoredAccessToken();
    expect(storedToken).toBeFalsy();
  });
});
