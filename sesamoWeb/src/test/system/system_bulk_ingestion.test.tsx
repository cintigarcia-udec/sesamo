import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { BulkUploader } from '../../components/BulkUploader';
import * as api from '../../services/api';

describe('SYSTEM TEST: Workflow de Carga Masiva Real de Preguntas desde Hoja de Cálculo (XLSX)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    vi.spyOn(api, 'getCategories').mockResolvedValue([
      { id: 1, name: 'Ciencias Naturales' },
    ]);
    vi.spyOn(api, 'getQuestionnaires').mockResolvedValue([
      { id: 10, category_id: 1, questionnaire_number: 1, category_name: 'Ciencias Naturales' },
    ]);
  });

  const createAdminToken = () => {
    const payload = { sub: 'admin@sesamo.com', role_id: 1, name: 'Admin' };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  it('procesa archivo XLSX binario, valida preguntas y ejecuta carga encadenada de preguntas y opciones', async () => {
    const adminToken = createAdminToken();
    vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

    // Mock de endpoints de creación en el backend
    let questionIdCounter = 100;
    const createQuestionSpy = vi.spyOn(api, 'createQuestion').mockImplementation(async (data) => {
      questionIdCounter++;
      return { id: questionIdCounter, ...data };
    });

    const createdOptions: Array<{ question_id: number; option_key: string; is_correct: boolean }> = [];
    const createOptionSpy = vi.spyOn(api, 'createAnswerOption').mockImplementation(async (data) => {
      createdOptions.push(data);
      return { id: Math.floor(Math.random() * 1000), ...data };
    });

    // 1. Crear un archivo Excel XLSX real en memoria con 2 preguntas y sus 4 opciones
    const wb = XLSX.utils.book_new();
    const rows = [
      {
        cuestionario_id: 10,
        pregunta: '¿Cuál es la velocidad aproximada de la luz en el vacío?',
        opcion_a: '150.000 km/s',
        opcion_b: '300.000 km/s',
        opcion_c: '450.000 km/s',
        opcion_d: '600.000 km/s',
        respuesta_correcta: 'B',
      },
      {
        cuestionario_id: 10,
        pregunta: '¿Cuál es el símbolo químico del elemento Oro?',
        opcion_a: 'Ag',
        opcion_b: 'Fe',
        opcion_c: 'Au',
        opcion_d: 'Pb',
        respuesta_correcta: 'C',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Preguntas');
    const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const realXlsxFile = new File([arrayBuffer], 'preguntas_ciencias.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // 2. Renderizar el componente de Carga Masiva
    render(<BulkUploader authKey={1} />);
    await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

    // 3. Simular selección del archivo Excel en la zona de dropzone
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    fireEvent.change(fileInput, { target: { files: [realXlsxFile] } });

    // 4. Comprobar que el parser procesó el XLSX y estructuró la vista previa
    await waitFor(() => {
      expect(screen.getByText('¿Cuál es la velocidad aproximada de la luz en el vacío?')).toBeInTheDocument();
      expect(screen.getByText('¿Cuál es el símbolo químico del elemento Oro?')).toBeInTheDocument();
      expect(screen.getByText('✓ Válidos:')).toBeInTheDocument();
    });

    // 5. Iniciar la carga hacia la base de datos
    const uploadBtn = screen.getByRole('button', { name: /Cargar 2 Registros Válidos/i });
    fireEvent.click(uploadBtn);

    // 6. Verificar que se hayan creado las 2 preguntas en el backend
    await waitFor(() => {
      expect(createQuestionSpy).toHaveBeenCalledTimes(2);
    });
    expect(createQuestionSpy).toHaveBeenNthCalledWith(1, {
      question_text: '¿Cuál es la velocidad aproximada de la luz en el vacío?',
      questionnaire_id: 10,
    });
    expect(createQuestionSpy).toHaveBeenNthCalledWith(2, {
      question_text: '¿Cuál es el símbolo químico del elemento Oro?',
      questionnaire_id: 10,
    });

    // 7. Verificar que se hayan creado las 8 opciones (4 por pregunta) con sus claves correctas
    await waitFor(() => {
      expect(createOptionSpy).toHaveBeenCalledTimes(8);
    });

    // Opciones de pregunta 1 (101): opción B es la correcta
    const q1Options = createdOptions.filter((o) => o.question_id === 101);
    expect(q1Options).toHaveLength(4);
    expect(q1Options.find((o) => o.option_key === 'B')?.is_correct).toBe(true);
    expect(q1Options.find((o) => o.option_key === 'A')?.is_correct).toBe(false);

    // Opciones de pregunta 2 (102): opción C es la correcta
    const q2Options = createdOptions.filter((o) => o.question_id === 102);
    expect(q2Options).toHaveLength(4);
    expect(q2Options.find((o) => o.option_key === 'C')?.is_correct).toBe(true);
    expect(q2Options.find((o) => o.option_key === 'B')?.is_correct).toBe(false);

    // 8. Verificar mensaje final de confirmación en la UI
    await waitFor(() => {
      expect(screen.getByText(/Carga finalizada: 2 exitosas, 0 con error/i)).toBeInTheDocument();
    });
  });
});
