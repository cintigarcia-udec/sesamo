import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import QuizQuestionsScreen from '../../app/quiz/questions';
import QuizResultsScreen from '../../app/quiz/results';
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

describe('SYSTEM TEST: Workflow de Evaluación (Carga -> Presentación -> Envío -> Resultados)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStoredAccessToken();
    mockLocalParams = { quizId: '10' };
  });

  const createFakeStudentJwt = (userId: number = 77) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'estudiante@sesamo.com',
        user_id: userId,
        role_id: 2,
        name: 'Carlos',
        last_name: 'Gómez',
      })
    ).toString('base64');
    return `${header}.${payload}.sig`;
  };

  it('ejecuta el ciclo de examen completo: carga de preguntas, selección de opción, envío a API y navegación a resultados', async () => {
    await setStoredAccessToken(createFakeStudentJwt(77));

    // Mock de preguntas y opciones devueltas por el backend
    jest.spyOn(api.questions, 'list').mockResolvedValue([
      { id: 1, questionnaire_id: 10, question_text: '¿Cuál es la fórmula del agua?' },
    ] as any);

    jest.spyOn(api.answerOptions, 'list').mockResolvedValue([
      { id: 101, question_id: 1, option_key: 'A', answer: 'CO2', is_correct: false },
      { id: 102, question_id: 1, option_key: 'B', answer: 'H2O', is_correct: true },
      { id: 103, question_id: 1, option_key: 'C', answer: 'NaCl', is_correct: false },
      { id: 104, question_id: 1, option_key: 'D', answer: 'O2', is_correct: false },
    ] as any);

    const createResponseSpy = jest.spyOn(api.userResponses, 'create').mockResolvedValue({
      id: 501,
      user_id: 77,
      questionnaire_id: 10,
      score: 100,
      answers: '{"1":"B"}',
    } as any);

    render(<QuizQuestionsScreen />);

    // 1. Verificar carga y renderizado de la pregunta
    expect(await screen.findByText('¿Cuál es la fórmula del agua?')).toBeTruthy();
    expect(screen.getByText('H2O')).toBeTruthy();
    expect(screen.getByText('CO2')).toBeTruthy();

    // El botón debe estar disponible
    const submitBtn = screen.getByRole('button', { name: /Enviar respuestas/i });
    expect(submitBtn).toBeTruthy();

    // 2. Estudiante selecciona la opción correcta "B"
    const optionB = screen.getByLabelText('Opción B: H2O');
    fireEvent.press(optionB);

    // 3. Estudiante envía el examen finalizado
    fireEvent.press(submitBtn);

    // 4. Se comprueba que la API recibe el payload de calificación con el ID del estudiante
    await waitFor(() => {
      expect(createResponseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 77,
          questionnaire_id: 10,
          answers: { 1: 'B' },
        })
      );
    });

    // 5. Redirección a la pantalla de resultados con parámetros de puntaje
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/quiz/results',
          params: expect.objectContaining({
            score: '100',
            correct: '1',
            total: '1',
          }),
        })
      );
    });
  });

  it('renderiza la pantalla de resultados con las métricas finales consolidadas', () => {
    mockLocalParams = {
      score: '100',
      correct: '1',
      total: '1',
      time: '01:15',
    };

    render(<QuizResultsScreen />);

    expect(screen.getByText('Precisión: 100%')).toBeTruthy();
    expect(screen.getByText('Respuestas correctas')).toBeTruthy();
    expect(screen.getByText('01:15')).toBeTruthy();
  });
});
