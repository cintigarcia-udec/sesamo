import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthBar } from '../../components/AuthBar';
import { BulkUploader } from '../../components/BulkUploader';
import * as api from '../../services/api';
import * as fileParser from '../../services/fileParser';

describe('USABILITY TEST: Control del Usuario, Ayuda Contextual y Diagnóstico (Heurísticas Nielsen 3, 8 & 10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'getCategories').mockResolvedValue([
      { id: 1, name: 'Ciencias Naturales' },
      { id: 2, name: 'Matemáticas' },
    ]);
    vi.spyOn(api, 'getQuestionnaires').mockResolvedValue([
      { id: 10, category_id: 1, questionnaire_number: 1, category_name: 'Ciencias Naturales' },
    ]);
  });

  const createFakeToken = (payload: Record<string, unknown>) => {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  describe('Heurística 10: Ayuda y Documentación Guiada mediante Plantillas', () => {
    it('ofrece botones de descarga de plantilla en formatos CSV y XLSX para evitar ambigüedades en la estructura', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);
      const downloadSpy = vi.spyOn(fileParser, 'downloadTemplate').mockImplementation(() => {});

      render(<BulkUploader authKey={1} />);
      await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

      const csvBtn = screen.getByRole('button', { name: /Plantilla CSV/i });
      const xlsxBtn = screen.getByRole('button', { name: /Plantilla Excel \(\.xlsx\)/i });

      expect(csvBtn).toBeInTheDocument();
      expect(xlsxBtn).toBeInTheDocument();

      fireEvent.click(csvBtn);
      expect(downloadSpy).toHaveBeenCalledWith('questions', 'csv');

      fireEvent.click(xlsxBtn);
      expect(downloadSpy).toHaveBeenCalledWith('questions', 'xlsx');
    });
  });

  describe('Heurística 3: Control y Libertad en la Carga de Archivos (Dropzone)', () => {
    it('indica visualmente el estado de arrastre (dragover) y permite sustituir el archivo cargado', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

      vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([{}, {}] as any);
      vi.spyOn(fileParser, 'validateQuestionRows').mockReturnValue([] as any);

      render(<BulkUploader authKey={1} />);

      const dropzone = document.querySelector('.dropzone') as HTMLElement;
      expect(dropzone).toBeInTheDocument();

      // Drag over activa clase dragging
      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('dragging');

      // Drag leave retira clase
      fireEvent.dragLeave(dropzone);
      expect(dropzone).not.toHaveClass('dragging');

      // Seleccionar archivo
      const file = new File(['contenido'], 'examen_ciencias.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('examen_ciencias.csv')).toBeInTheDocument();
        expect(screen.getByText(/Haz clic o arrastra otro archivo para cambiar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Ayuda Contextual y Claridad en Datos Relacionados', () => {
    it('despliega explicaciones sobre el cuestionario destino predeterminado', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

      render(<BulkUploader authKey={1} />);
      await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

      expect(
        screen.getByText(/Se usará para filas donde la columna/i)
      ).toBeInTheDocument();
      expect(screen.getByText('cuestionario_id')).toBeInTheDocument();
    });

    it('presenta etiquetas de categorías disponibles para facilitar la correlación al cargar cuestionarios', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

      render(<BulkUploader authKey={1} />);
      await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

      // Ir a la pestaña de Cuestionarios
      fireEvent.click(screen.getByRole('button', { name: /Cuestionarios/i }));

      // Deben visualizarse las categorías cargadas de la base de datos
      expect(screen.getByText(/Categorías Disponibles en la BD:/i)).toBeInTheDocument();
      expect(screen.getByText(/ID 1: Ciencias Naturales/i)).toBeInTheDocument();
      expect(screen.getByText(/ID 2: Matemáticas/i)).toBeInTheDocument();
    });
  });

  describe('Heurística 1 & Transparencia: Consola de Auditoría y Estado de Sesión', () => {
    it('formatea y clasifica semánticamente las líneas de auditoría en la consola de logs', async () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

      const mockQuestion = {
        rowNumber: 2,
        questionnaire_id: 10,
        question_text: '¿Es el ADN un ácido nucleico?',
        option_a: 'Sí',
        option_b: 'No',
        option_c: 'Tal vez',
        option_d: 'Nunca',
        correct_option: 'A',
        isValid: true,
        errors: [],
      };

      vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([mockQuestion] as any);
      vi.spyOn(fileParser, 'validateQuestionRows').mockReturnValue([mockQuestion] as any);

      vi.spyOn(api, 'createQuestion').mockResolvedValue({ id: 55, questionnaire_id: 10, question_text: 'ADN' });
      vi.spyOn(api, 'createAnswerOption').mockResolvedValue({ id: 1, question_id: 55, option_key: 'A', answer: 'Sí' });

      render(<BulkUploader authKey={1} />);

      const file = new File(['dummy'], 'preguntas.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cargar 1 Registros Válidos/i })).toBeEnabled();
      });

      fireEvent.click(screen.getByRole('button', { name: /Cargar 1 Registros Válidos/i }));

      await waitFor(() => {
        expect(screen.getByText('Proceso Finalizado')).toBeInTheDocument();
      });

      // La consola de logs debe contener líneas con clase success y timestamp
      const logLines = document.querySelectorAll('.log-line.success');
      expect(logLines.length).toBeGreaterThan(0);
      expect(logLines[0].querySelector('.log-time')).toBeInTheDocument();
    });

    it('AuthBar presenta indicador de identidad y permite el cierre de sesión inmediato', () => {
      const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1, email: 'admin@sesamo.com' });
      vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);
      const setStoredSpy = vi.spyOn(api, 'setStoredToken');

      const onAuthChangeMock = vi.fn();
      render(<AuthBar onAuthChange={onAuthChangeMock} />);

      expect(screen.getByText('🛡️ Admin')).toBeInTheDocument();
      expect(screen.getByText('admin@sesamo.com')).toBeInTheDocument();

      const logoutBtn = screen.getByRole('button', { name: /Salir/i });
      fireEvent.click(logoutBtn);

      expect(setStoredSpy).toHaveBeenCalledWith(null);
      expect(onAuthChangeMock).toHaveBeenCalledTimes(1);
    });
  });
});
