import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkUploader } from '../../components/BulkUploader';
import * as api from '../../services/api';
import * as fileParser from '../../services/fileParser';

describe('USABILITY TEST: Visibilidad del Estado del Sistema y Prevención de Errores (Heurísticas Nielsen 1 & 5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'getCategories').mockResolvedValue([
      { id: 1, name: 'Ciencias' },
    ]);
    vi.spyOn(api, 'getQuestionnaires').mockResolvedValue([
      { id: 10, category_id: 1, questionnaire_number: 1 },
    ]);
  });

  const createFakeToken = (payload: Record<string, unknown>) => {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  const mockParsedQuestions = [
    {
      rowNumber: 2,
      questionnaire_id: 10,
      question_text: '¿Cuál es la velocidad de la luz?',
      option_a: '300,000 km/s',
      option_b: '150,000 km/s',
      option_c: '1,000 km/s',
      option_d: '100 km/h',
      correct_option: 'A',
      isValid: true,
      errors: [],
    },
    {
      rowNumber: 3,
      questionnaire_id: 10,
      question_text: '¿Cuántos planetas hay en el sistema solar?',
      option_a: '8',
      option_b: '9',
      option_c: '7',
      option_d: '10',
      correct_option: 'A',
      isValid: true,
      errors: [],
    },
    {
      rowNumber: 4,
      questionnaire_id: 10,
      question_text: 'Pregunta incompleta sin opciones',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'X',
      isValid: false,
      errors: ['Faltan opciones de respuesta', 'Clave correcta inválida'],
    },
  ];

  describe('Heurística 1: Visibilidad de Métricas de Validación en Previsualización', () => {
    it('desglosa cuantitativamente el total, filas válidas y filas con error mediante insignias visuales', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

      vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([{}, {}, {}] as any);
      vi.spyOn(fileParser, 'validateQuestionRows').mockReturnValue(mockParsedQuestions as any);

      render(<BulkUploader authKey={1} />);
      await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

      // Cargar archivo
      const file = new File(['dummy'], 'preguntas.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Total:/i)).toBeInTheDocument();
      });

      // Validar píldoras de métricas de forma contextual
      const totalPill = screen.getByText(/Total:/i).closest('.metric-pill');
      expect(totalPill).toHaveTextContent('3');

      const validPill = screen.getByText(/✓ Válidos:/i).closest('.metric-pill');
      expect(validPill).toHaveTextContent('2');

      const errorPill = screen.getByText(/✕ Errores:/i).closest('.metric-pill');
      expect(errorPill).toHaveTextContent('1');
    });

    it('facilita la depuración filtrando interactivamente por Solo Errores y Solo Válidos', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

      vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([{}, {}, {}] as any);
      vi.spyOn(fileParser, 'validateQuestionRows').mockReturnValue(mockParsedQuestions as any);

      render(<BulkUploader authKey={1} />);

      const file = new File(['dummy'], 'preguntas.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('¿Cuál es la velocidad de la luz?')).toBeInTheDocument();
      });

      // Filtrar a Solo Errores
      fireEvent.click(screen.getByRole('button', { name: /Solo Errores/i }));
      expect(screen.queryByText('¿Cuál es la velocidad de la luz?')).not.toBeInTheDocument();
      expect(screen.getByText('Pregunta incompleta sin opciones')).toBeInTheDocument();

      // Filtrar a Solo Válidos
      fireEvent.click(screen.getByRole('button', { name: /Solo Válidos/i }));
      expect(screen.getByText('¿Cuál es la velocidad de la luz?')).toBeInTheDocument();
      expect(screen.queryByText('Pregunta incompleta sin opciones')).not.toBeInTheDocument();

      // Restaurar Todos
      fireEvent.click(screen.getByRole('button', { name: /Todos/i }));
      expect(screen.getByText('¿Cuál es la velocidad de la luz?')).toBeInTheDocument();
      expect(screen.getByText('Pregunta incompleta sin opciones')).toBeInTheDocument();
    });
  });

  describe('Heurística 5: Prevención de Errores e Ingesta Inadvertida', () => {
    it('bloquea el botón de carga si no hay registros válidos para procesar', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

      // Archivo con solo errores
      const onlyErrors = [
        {
          rowNumber: 2,
          questionnaire_id: 10,
          question_text: 'Mala fila',
          isValid: false,
          errors: ['Error total'],
        },
      ];

      vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([{}] as any);
      vi.spyOn(fileParser, 'validateQuestionRows').mockReturnValue(onlyErrors as any);

      render(<BulkUploader authKey={1} />);

      const file = new File(['dummy'], 'bad.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Mala fila')).toBeInTheDocument();
      });

      const uploadBtn = screen.getByRole('button', { name: /Cargar 0 Registros Válidos/i });
      expect(uploadBtn).toBeDisabled();
    });

    it('informa y previene la carga a usuarios sin privilegios administrativos', async () => {
      // Sin token de admin
      vi.spyOn(api, 'getStoredToken').mockReturnValue(null);

      vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([{}, {}] as any);
      vi.spyOn(fileParser, 'validateQuestionRows').mockReturnValue([
        mockParsedQuestions[0],
        mockParsedQuestions[1],
      ] as any);

      render(<BulkUploader authKey={1} />);

      const file = new File(['dummy'], 'preguntas.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(document.querySelector('.alert-warning')).toHaveTextContent(/Inicia sesión como Admin/i);
      });

      const uploadBtn = screen.getByRole('button', { name: /Cargar 2 Registros Válidos/i });
      expect(uploadBtn).toBeDisabled();
    });
  });

  describe('Heurística 1: Visibilidad del Progreso y Conclusión de Ingesta', () => {
    it('despliega barra de progreso porcentual y tarjeta de finalización con métricas exactas', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

      vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([mockParsedQuestions[0]] as any);
      vi.spyOn(fileParser, 'validateQuestionRows').mockReturnValue([mockParsedQuestions[0]] as any);

      vi.spyOn(api, 'createQuestion').mockResolvedValue({ id: 999, questionnaire_id: 10, question_text: 'Q1' });
      vi.spyOn(api, 'createAnswerOption').mockResolvedValue({ id: 1, question_id: 999, option_key: 'A', answer: 'Ans' });

      render(<BulkUploader authKey={1} />);

      const file = new File(['dummy'], 'preguntas.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cargar 1 Registros Válidos/i })).toBeEnabled();
      });

      fireEvent.click(screen.getByRole('button', { name: /Cargar 1 Registros Válidos/i }));

      // Verificar que se renderiza el progreso y finalmente la tarjeta de finalización
      await waitFor(() => {
        expect(screen.getByText('Proceso Finalizado')).toBeInTheDocument();
        expect(screen.getByText(/Exitosos:/i)).toBeInTheDocument();
        expect(screen.getByText('1 / 1 (100%)')).toBeInTheDocument();
      });
    });
  });
});
