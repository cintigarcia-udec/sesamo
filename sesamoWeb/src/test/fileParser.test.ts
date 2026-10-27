import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseFileToRawRows,
  validateCategoryRows,
  validateQuestionnaireRows,
  validateQuestionRows,
} from '../services/fileParser';

describe('fileParser service', () => {
  describe('validateQuestionRows', () => {
    it('validates a complete, correctly formatted question row', () => {
      const rows = [
        {
          cuestionario_id: '10',
          pregunta: '¿Cuál es la capital de Colombia?',
          opcion_a: 'Bogotá',
          opcion_b: 'Medellín',
          opcion_c: 'Cali',
          opcion_d: 'Barranquilla',
          respuesta_correcta: 'A',
        },
      ];

      const result = validateQuestionRows(rows);
      expect(result).toHaveLength(1);
      expect(result[0].isValid).toBe(true);
      expect(result[0].errors).toEqual([]);
      expect(result[0].questionnaire_id).toBe(10);
      expect(result[0].question_text).toBe('¿Cuál es la capital de Colombia?');
      expect(result[0].option_a).toBe('Bogotá');
      expect(result[0].correct_option).toBe('A');
      expect(result[0].rowNumber).toBe(2);
    });

    it('normalizes lowercase correct_option to uppercase', () => {
      const rows = [
        {
          questionnaire_id: '5',
          question: 'Pregunta de prueba',
          option_a: '1',
          option_b: '2',
          option_c: '3',
          option_d: '4',
          correct_option: 'b',
        },
      ];

      const result = validateQuestionRows(rows);
      expect(result[0].isValid).toBe(true);
      expect(result[0].correct_option).toBe('B');
    });

    it('uses fallbackQuestionnaireId when row lacks questionnaire_id', () => {
      const rows = [
        {
          pregunta: 'Pregunta sin ID de cuestionario explícito',
          opcion_a: 'Op 1',
          opcion_b: 'Op 2',
          opcion_c: 'Op 3',
          opcion_d: 'Op 4',
          respuesta_correcta: 'C',
        },
      ];

      const result = validateQuestionRows(rows, 42);
      expect(result[0].isValid).toBe(true);
      expect(result[0].questionnaire_id).toBe(42);
    });

    it('flags errors when mandatory fields are missing', () => {
      const rows = [
        {
          pregunta: '',
          opcion_a: 'A',
          opcion_b: '',
          opcion_c: 'C',
          opcion_d: '',
          respuesta_correcta: 'X',
        },
      ];

      const result = validateQuestionRows(rows);
      expect(result[0].isValid).toBe(false);
      expect(result[0].errors).toContain('Falta el ID del cuestionario (indícalo en la columna o selecciónalo arriba).');
      expect(result[0].errors).toContain('El texto de la pregunta está vacío.');
      expect(result[0].errors).toContain('Falta la opción B.');
      expect(result[0].errors).toContain('Falta la opción D.');
      expect(result[0].errors.some((e) => e.includes('Opción correcta inválida'))).toBe(true);
    });
  });

  describe('validateQuestionnaireRows', () => {
    it('validates a correct questionnaire row with column aliases', () => {
      const rows = [
        {
          id_categoria: '3',
          cuestionario_numero: '2',
        },
      ];

      const result = validateQuestionnaireRows(rows);
      expect(result).toHaveLength(1);
      expect(result[0].isValid).toBe(true);
      expect(result[0].category_id).toBe(3);
      expect(result[0].questionnaire_number).toBe(2);
      expect(result[0].errors).toEqual([]);
    });

    it('flags error for missing or non-numeric category_id and questionnaire_number', () => {
      const rows = [
        {
          categoria_id: 'invalido',
          numero_cuestionario: '0',
        },
      ];

      const result = validateQuestionnaireRows(rows);
      expect(result[0].isValid).toBe(false);
      expect(result[0].errors).toContain('Falta un ID de categoría numérico válido.');
      expect(result[0].errors).toContain('Falta un número de cuestionario válido.');
    });
  });

  describe('validateCategoryRows', () => {
    it('validates valid category rows with standard and alias headers', () => {
      const rows = [
        { nombre: 'Matemáticas' },
        { categoria: 'Ciencias Naturales' },
      ];

      const result = validateCategoryRows(rows);
      expect(result).toHaveLength(2);
      expect(result[0].isValid).toBe(true);
      expect(result[0].name).toBe('Matemáticas');
      expect(result[1].isValid).toBe(true);
      expect(result[1].name).toBe('Ciencias Naturales');
    });

    it('flags error when category name is empty', () => {
      const rows = [{ nombre: '   ' }];

      const result = validateCategoryRows(rows);
      expect(result[0].isValid).toBe(false);
      expect(result[0].errors).toContain('El nombre de la categoría es obligatorio.');
    });
  });

  describe('parseFileToRawRows', () => {
    it('parses an XLSX workbook from a File object into raw rows', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([
        { Nombre: 'Categoría A' },
        { Nombre: 'Categoría B' },
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const file = new File([arrayBuffer], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const rows = await parseFileToRawRows(file);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ Nombre: 'Categoría A' });
      expect(rows[1]).toEqual({ Nombre: 'Categoría B' });
    });

    it('throws error when the sheet is empty', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, ws, 'Vacia');
      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const file = new File([arrayBuffer], 'empty.xlsx');

      await expect(parseFileToRawRows(file)).rejects.toThrow(
        'La hoja está vacía o no tiene filas de datos.'
      );
    });
  });
});
