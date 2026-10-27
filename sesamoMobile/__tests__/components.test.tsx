import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppText } from '@/components/design/app-text';
import { AppCard } from '@/components/design/app-card';
import { AppButton } from '@/components/design/app-button';
import { AppInput } from '@/components/design/app-input';

describe('Design System UI Components', () => {
  describe('AppText', () => {
    it('renders the given text content', () => {
      const { getByText } = render(<AppText>Bienvenido a Sésamo</AppText>);
      expect(getByText('Bienvenido a Sésamo')).toBeTruthy();
    });

    it('renders different typography variants', () => {
      const { getByText } = render(<AppText variant="headline">Título Principal</AppText>);
      expect(getByText('Título Principal')).toBeTruthy();
    });
  });

  describe('AppCard', () => {
    it('renders its children correctly inside a container', () => {
      const { getByText } = render(
        <AppCard>
          <AppText>Contenido dentro de tarjeta</AppText>
        </AppCard>
      );
      expect(getByText('Contenido dentro de tarjeta')).toBeTruthy();
    });
  });

  describe('AppButton', () => {
    it('renders button label and fires onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <AppButton onPress={onPressMock}>Iniciar Cuestionario</AppButton>
      );

      const buttonText = getByText('Iniciar Cuestionario');
      expect(buttonText).toBeTruthy();

      fireEvent.press(buttonText);
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('does not fire onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <AppButton onPress={onPressMock} disabled={true}>
          Boton Desactivado
        </AppButton>
      );

      const buttonText = getByText('Boton Desactivado');
      fireEvent.press(buttonText);
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('AppInput', () => {
    it('renders with placeholder and triggers onChangeText', () => {
      const onChangeMock = jest.fn();
      const { getByPlaceholderText } = render(
        <AppInput
          placeholder="Ingresa tu correo"
          onChangeText={onChangeMock}
        />
      );

      const input = getByPlaceholderText('Ingresa tu correo');
      expect(input).toBeTruthy();

      fireEvent.changeText(input, 'admin@sesamo.com');
      expect(onChangeMock).toHaveBeenCalledWith('admin@sesamo.com');
    });
  });
});
