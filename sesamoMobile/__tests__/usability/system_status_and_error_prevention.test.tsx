import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginScreen from '../../app/auth/login';
import QuizQuestionsScreen from '../../app/quiz/questions';
import { api, clearStoredAccessToken, setStoredAccessToken } from '../../constants/api';

const mockReplace = jest.fn();
const mockBack = jest.fn();

let mockLocalParams: Record<string, any> = { quizId: '10' };

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    push: jest.fn(),
  }),
  useLocalSearchParams: () => mockLocalParams,
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  };
});

describe('USABILITY TEST: Visibilidad del Estado del Sistema y Prevención de Errores (Heurísticas Nielsen 1 & 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStoredAccessToken();
    mockLocalParams = { quizId: '10' };
  });

  describe('Heurística 5: Prevención de errores en formularios (Login)', () => {
    it('muestra retroalimentación instantánea ante formato erróneo de correo sin requerir presionar enviar', () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('ejemplo@correo.com');
      const submitBtn = screen.getByLabelText('Botón de Iniciar Sesión');

      // Inicialmente deshabilitado
      expect(submitBtn.props.accessibilityState.disabled).toBe(true);

      // Escribir correo sin dominio ni arroba
      fireEvent.changeText(emailInput, 'usuarioinvalido');
      expect(screen.getByText('Formato de correo inválido.')).toBeTruthy();
      expect(submitBtn.props.accessibilityState.disabled).toBe(true);

      // Corregir el correo
      fireEvent.changeText(emailInput, 'valido@sesamo.com');
      expect(screen.queryByText('Formato de correo inválido.')).toBeNull();
    });

    it('previene envíos accidentales manteniendo el botón deshabilitado hasta completar credenciales válidas', () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('ejemplo@correo.com');
      const passInput = screen.getByPlaceholderText('********');
      const submitBtn = screen.getByLabelText('Botón de Iniciar Sesión');

      // Solo email ingresado -> aún deshabilitado
      fireEvent.changeText(emailInput, 'estudiante@sesamo.com');
      expect(submitBtn.props.accessibilityState.disabled).toBe(true);

      // Ingresar contraseña -> ahora el botón se habilita
      fireEvent.changeText(passInput, 'Secreto123');
      expect(submitBtn.props.accessibilityState.disabled).toBe(false);
    });

    it('proporciona control de visibilidad al usuario permitiendo alternar ver/ocultar contraseña', () => {
      render(<LoginScreen />);

      const passInput = screen.getByPlaceholderText('********');
      expect(passInput.props.secureTextEntry).toBe(true);

      const toggleBtn = screen.getByRole('button', { name: 'Mostrar contraseña' });
      fireEvent.press(toggleBtn);

      // Al alternar, el input ya no oculta los caracteres y el label cambia a 'Ocultar contraseña'
      expect(passInput.props.secureTextEntry).toBe(false);
      expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeTruthy();
    });
  });

  describe('Heurística 1: Visibilidad del Estado del Sistema y Prevención en Cuestionarios', () => {
    const mockQuestions = [
      { id: 101, questionnaire_id: 10, question_text: '¿Qué es React Native?' },
      { id: 102, questionnaire_id: 10, question_text: '¿Qué es Expo?' },
    ];
    const mockOptions = [
      { id: 1, question_id: 101, option_key: 'A', answer: 'Un framework móvil', is_correct: true },
      { id: 2, question_id: 101, option_key: 'B', answer: 'Una base de datos', is_correct: false },
      { id: 3, question_id: 102, option_key: 'A', answer: 'Una plataforma de desarrollo', is_correct: true },
    ];

    it('muestra estado de carga explícito mientras se obtienen preguntas de la API', async () => {
      let resolvePromise: (val: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      jest.spyOn(api.questions, 'list').mockReturnValue(pendingPromise as any);
      jest.spyOn(api.answerOptions, 'list').mockResolvedValue([]);

      const { unmount } = render(<QuizQuestionsScreen />);

      // Debe mostrar el estado de carga
      expect(screen.getByText('Cargando preguntas')).toBeTruthy();
      expect(screen.getByText('Preparando el cuestionario...')).toBeTruthy();

      await act(async () => {
        resolvePromise!(mockQuestions);
      });
      unmount();
    });

    it('visibiliza el progreso con numeración clara y cronómetro regresivo', async () => {
      jest.spyOn(api.questions, 'list').mockResolvedValue(mockQuestions as any);
      jest.spyOn(api.answerOptions, 'list').mockResolvedValue(mockOptions as any);

      render(<QuizQuestionsScreen />);

      // Esperar a que rendericen las preguntas
      await waitFor(() => {
        expect(screen.getByText('¿Qué es React Native?')).toBeTruthy();
      });

      // Visibilidad del paso actual e indicador total
      expect(screen.getByText('01')).toBeTruthy();
      expect(screen.getByText('/ 2')).toBeTruthy();
      expect(screen.getByText('Progreso de evaluación')).toBeTruthy();

      // Cronómetro visible con tiempo estándar (15:00)
      expect(screen.getByText('15:00')).toBeTruthy();
    });

    it('previene avance accidental deshabilitando el botón de confirmación hasta seleccionar una opción', async () => {
      jest.spyOn(api.questions, 'list').mockResolvedValue(mockQuestions as any);
      jest.spyOn(api.answerOptions, 'list').mockResolvedValue(mockOptions as any);

      render(<QuizQuestionsScreen />);

      await waitFor(() => {
        expect(screen.getByText('¿Qué es React Native?')).toBeTruthy();
      });

      // El botón de confirmar debe estar deshabilitado inicialmente
      const confirmBtn = screen.getByRole('button', { name: 'Confirmar' });
      expect(confirmBtn.props.accessibilityState.disabled).toBe(true);

      // Al seleccionar la opción A
      const optionA = screen.getByRole('button', { name: 'Opción A: Un framework móvil' });
      fireEvent.press(optionA);

      // Ahora el botón de confirmar debe estar habilitado
      expect(confirmBtn.props.accessibilityState.disabled).toBe(false);
    });
  });
});
