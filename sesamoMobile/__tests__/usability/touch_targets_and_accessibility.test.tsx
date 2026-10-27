import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/design/app-button';
import { AppInput } from '../../components/design/app-input';
import LoginScreen from '../../app/auth/login';
import QuizResultsScreen from '../../app/quiz/results';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    score: '85',
    correct: '17',
    total: '20',
    time: '04:32',
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

describe('USABILITY TEST: Ergonomía Táctil y Accesibilidad Móvil (HIG / Material Design)', () => {
  describe('Criterio de área táctil mínima (Touch Target >= 48dp / 44pt)', () => {
    it('garantiza que AppButton cumple la altura mínima ergonómica en variante primaria', () => {
      render(<AppButton onPress={jest.fn()}>Continuar</AppButton>);
      const button = screen.getByRole('button', { name: 'Continuar' });

      const flattenedStyle = StyleSheet.flatten(button.props.style);
      expect(flattenedStyle.minHeight).toBeDefined();
      expect(flattenedStyle.minHeight).toBeGreaterThanOrEqual(48);
    });

    it('garantiza altura mínima ergonómica en variante secundaria y terciaria', () => {
      const { unmount } = render(
        <AppButton variant="secondary" onPress={jest.fn()}>
          Cancelar
        </AppButton>
      );
      const secondaryBtn = screen.getByRole('button', { name: 'Cancelar' });
      const secondaryStyle = StyleSheet.flatten(secondaryBtn.props.style);
      expect(secondaryStyle.minHeight).toBeGreaterThanOrEqual(48);
      unmount();

      render(
        <AppButton variant="tertiary" onPress={jest.fn()}>
          Ver detalles
        </AppButton>
      );
      const tertiaryBtn = screen.getByRole('button', { name: 'Ver detalles' });
      const tertiaryStyle = StyleSheet.flatten(tertiaryBtn.props.style);
      expect(tertiaryStyle.minHeight).toBeGreaterThanOrEqual(48);
    });

    it('AppInput provee padding ergonómico adecuado para interacción táctil en pantallas móviles', () => {
      const { toJSON } = render(<AppInput placeholder="Escribe aquí" />);
      const tree = toJSON();
      // El contenedor exterior tiene paddingHorizontal y paddingVertical
      const containerStyle = Array.isArray(tree?.props?.style)
        ? Object.assign({}, ...tree.props.style)
        : tree?.props?.style;

      expect(containerStyle.paddingVertical).toBeGreaterThanOrEqual(10);
      expect(containerStyle.paddingHorizontal).toBeGreaterThanOrEqual(14);
    });
  });

  describe('Semántica de Accesibilidad y Lectura Asistida (Screen Readers)', () => {
    it('AppButton expone accessibilityRole="button" y accessibilityLabel por defecto o personalizado', () => {
      render(
        <View>
          <AppButton onPress={jest.fn()}>Enviar</AppButton>
          <AppButton
            accessibilityLabel="Botón para guardar borrador"
            onPress={jest.fn()}
          >
            Guardar
          </AppButton>
        </View>
      );

      const defaultBtn = screen.getByRole('button', { name: 'Enviar' });
      expect(defaultBtn.props.accessibilityLabel).toBe('Enviar');

      const customBtn = screen.getByLabelText('Botón para guardar borrador');
      expect(customBtn.props.accessibilityRole).toBe('button');
    });

    it('AppButton en estado deshabilitado comunica visualmente y semánticamente la restricción', () => {
      render(
        <AppButton disabled={true} onPress={jest.fn()}>
          Acción Bloqueada
        </AppButton>
      );

      const button = screen.getByRole('button', { name: 'Acción Bloqueada' });
      expect(button.props.accessibilityState.disabled).toBe(true);

      const flattenedStyle = StyleSheet.flatten(button.props.style);
      expect(flattenedStyle.opacity).toBe(0.5);
    });

    it('LoginScreen incluye accessibilityHints y labels semánticos en campos clave para invidentes', () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('ejemplo@correo.com');
      expect(emailInput.props.accessibilityLabel).toBe('Campo de correo electrónico');
      expect(emailInput.props.accessibilityHint).toBe('Ingresa tu correo registrado');

      const passInput = screen.getByPlaceholderText('********');
      expect(passInput.props.accessibilityLabel).toBe('Campo de contraseña');
      expect(passInput.props.accessibilityHint).toBe('Ingresa tu contraseña');

      // Botón de alternar visibilidad de contraseña con accesibilidad y hitSlop ergonómico
      const toggleVisibilityBtn = screen.getByRole('button', { name: 'Mostrar contraseña' });
      expect(toggleVisibilityBtn).toBeTruthy();
      expect(toggleVisibilityBtn.props.hitSlop).toBe(10);

      const submitBtn = screen.getByLabelText('Botón de Iniciar Sesión');
      expect(submitBtn.props.accessibilityRole).toBe('button');
    });

    it('QuizResultsScreen expone elementos gráficos y avatares con accessibilityLabels legibles', () => {
      render(<QuizResultsScreen />);

      const avatar = screen.getByLabelText('Avatar de usuario');
      expect(avatar).toBeTruthy();

      const backBtn = screen.getByRole('button', { name: /Volver a la academia/i });
      expect(backBtn).toBeTruthy();
    });
  });
});
