import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Colors } from '../../constants/theme';
import QuizResultsScreen from '../../app/quiz/results';

let mockLocalParams: Record<string, any> = {
  score: '85',
  correct: '17',
  total: '20',
  time: '04:32',
  submitError: '',
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
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

describe('USABILITY TEST: Contraste de Temas, Claridad Cognitiva y Feedback (Heurística Nielsen 8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalParams = {
      score: '85',
      correct: '17',
      total: '20',
      time: '04:32',
      submitError: '',
    };
  });

  describe('Tokens de Color y Contraste Visual en Light / Dark Mode', () => {
    it('garantiza definición y diferenciación de pares semánticos en modo claro (Light)', () => {
      const light = Colors.light;

      // El fondo y su contenido deben ser distintos y definidos
      expect(light.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(light.onBackground).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(light.background).not.toBe(light.onBackground);

      // Botón primario y texto sobre primario
      expect(light.primary).toBe('#004d5b');
      expect(light.onPrimary).toBe('#ffffff');

      // Error y texto sobre error
      expect(light.error).toBe('#ba1a1a');
      expect(light.onError).toBe('#ffffff');
    });

    it('garantiza inversión adecuada de tokens de alto contraste en modo oscuro (Dark)', () => {
      const dark = Colors.dark;

      expect(dark.background).toBe('#0f1415'); // Fondo oscuro
      expect(dark.onBackground).toBe('#edf2f1'); // Texto claro

      expect(dark.primary).toBe('#86d2e5'); // Primario claro legible en fondo oscuro
      expect(dark.onPrimary).toBe('#001f26'); // Texto oscuro sobre primario claro

      expect(dark.error).toBe('#ffb4ab');
      expect(dark.onError).toBe('#690005');
    });
  });

  describe('Claridad Cognitiva y Feedback Constructivo en Pantalla de Resultados', () => {
    it('muestra estado de maestría "Dominado" cuando el puntaje es sobresaliente (>= 85)', () => {
      mockLocalParams = { score: '90', correct: '18', total: '20', time: '03:15' };
      render(<QuizResultsScreen />);

      // Se refleja tanto en la tarjeta hero como en la barra de precisión
      expect(screen.getAllByText(/90/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('/100')).toBeTruthy();
      expect(screen.getByText(/Dominado/)).toBeTruthy();
      expect(screen.getByText('Meta: 80%')).toBeTruthy();
    });

    it('muestra estado "Aprobado" para puntajes intermedios (70 - 84)', () => {
      mockLocalParams = { score: '75', correct: '15', total: '20', time: '05:00' };
      const { unmount } = render(<QuizResultsScreen />);

      expect(screen.getAllByText(/75/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Aprobado/)).toBeTruthy();
      unmount();
    });

    it('muestra mensaje constructivo "Requiere repaso" en lugar de mensajes frustrantes para reprobados (< 70)', () => {
      mockLocalParams = { score: '50', correct: '10', total: '20', time: '06:10' };
      render(<QuizResultsScreen />);

      expect(screen.getAllByText(/50/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Requiere repaso/)).toBeTruthy();
    });

    it('desglosa métricas cuantitativas clave de forma comprensible (aciertos y tiempo)', () => {
      mockLocalParams = { score: '85', correct: '17', total: '20', time: '04:32' };
      render(<QuizResultsScreen />);

      // Aciertos
      expect(screen.getByText('Respuestas correctas')).toBeTruthy();
      expect(screen.getByText('17')).toBeTruthy();
      expect(screen.getByText(/\/ 20/)).toBeTruthy();

      // Tiempo invertido
      expect(screen.getByText('Tiempo')).toBeTruthy();
      expect(screen.getByText('04:32')).toBeTruthy();
      expect(screen.getByText('min')).toBeTruthy();

      // Precisión
      expect(screen.getByText(/Precisión.*85%/)).toBeTruthy();
    });

    it('comunica errores de sincronización con el servidor de forma transparente sin ocultar el resultado al estudiante', () => {
      mockLocalParams = {
        score: '80',
        correct: '16',
        total: '20',
        time: '04:00',
        submitError: 'Fallo de conexión momentáneo',
      };
      render(<QuizResultsScreen />);

      expect(screen.getAllByText(/80/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Fallo de conexión momentáneo/)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Volver a la academia/i })).toBeTruthy();
    });
  });
});
