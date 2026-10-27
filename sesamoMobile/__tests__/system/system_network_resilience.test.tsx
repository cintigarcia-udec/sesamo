import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import QuizQuestionsScreen from '../../app/quiz/questions';
import { ApiError, api, clearStoredAccessToken, setStoredAccessToken } from '../../constants/api';

const mockReplace = jest.fn();
const mockBack = jest.fn();

let mockLocalParams: Record<string, any> = { quizId: '99' };

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

describe('SYSTEM TEST: Resiliencia de Red y Manejo de Errores en la App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStoredAccessToken();
    mockLocalParams = { quizId: '99' };
  });

  const createFakeStudentJwt = (userId: number = 88) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'resilience@sesamo.com',
        user_id: userId,
        role_id: 2,
        name: 'Ana',
        last_name: 'Torres',
      })
    ).toString('base64');
    return `${header}.${payload}.sig`;
  };

  it('maneja error 500 del backend al cargar preguntas, mostrando tarjeta de error y opción de retorno', async () => {
    await setStoredAccessToken(createFakeStudentJwt());

    jest.spyOn(api.questions, 'list').mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 500,
        message: 'Error interno en el servidor de cuestionarios.',
      })
    );

    render(<QuizQuestionsScreen />);

    expect(await screen.findByText('No se pudo cargar el cuestionario')).toBeTruthy();
    expect(screen.getByText('Error interno en el servidor de cuestionarios.')).toBeTruthy();

    const backBtn = screen.getByText('Volver');
    fireEvent.press(backBtn);

    expect(mockBack).toHaveBeenCalled();
  });

  it('atrapa caída de conexión durante el envío del resultado y navega a resultados reportando submitError', async () => {
    await setStoredAccessToken(createFakeStudentJwt(88));

    jest.spyOn(api.questions, 'list').mockResolvedValue([
      { id: 2, questionnaire_id: 99, question_text: '¿Cuánto es 5 x 5?' },
    ] as any);

    jest.spyOn(api.answerOptions, 'list').mockResolvedValue([
      { id: 201, question_id: 2, option_key: 'A', answer: '25', is_correct: true },
      { id: 202, question_id: 2, option_key: 'B', answer: '30', is_correct: false },
    ] as any);

    jest.spyOn(api.userResponses, 'create').mockRejectedValue(
      new ApiError({
        kind: 'network',
        status: 0,
        message: 'Sin conexión a internet al enviar.',
      })
    );

    render(<QuizQuestionsScreen />);

    expect(await screen.findByText('¿Cuánto es 5 x 5?')).toBeTruthy();

    const optionA = screen.getByLabelText('Opción A: 25');
    fireEvent.press(optionA);

    const submitBtn = screen.getByRole('button', { name: /Enviar respuestas/i });
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/quiz/results',
          params: expect.objectContaining({
            submitError: 'Sin conexión a internet al enviar.',
          }),
        })
      );
    });
  });
});
