import * as XLSX from 'xlsx';
import type {
  EntityType,
  ParsedCategoryRow,
  ParsedQuestionnaireRow,
  ParsedQuestionRow,
  RawRow,
} from '../types/bulk';

/**
 * Normaliza nombres de columnas eliminando acentos, caracteres especiales y espacios.
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

/**
 * Convierte un objeto fila a uno con claves normalizadas.
 */
function normalizeRow(row: RawRow): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const normKey = normalizeKey(k);
    normalized[normKey] = v !== null && v !== undefined ? String(v).trim() : '';
  }
  return normalized;
}

/**
 * Parsea un archivo File (.csv, .xlsx, .xls) a una lista de objetos crudos.
 */
export async function parseFileToRawRows(file: File): Promise<RawRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('El archivo no contiene ninguna hoja de cálculo.');
  }
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('No se pudo leer el contenido de la hoja.');
  }
  const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: '' });
  if (rows.length === 0) {
    throw new Error('La hoja está vacía o no tiene filas de datos.');
  }
  return rows;
}

/**
 * Valida y estructura las filas de Preguntas con Opciones A-D.
 */
export function validateQuestionRows(
  rows: RawRow[],
  fallbackQuestionnaireId?: number
): ParsedQuestionRow[] {
  return rows.map((rawRow, idx) => {
    const r = normalizeRow(rawRow);
    const rowNumber = idx + 2; // +1 para índice base 1, +1 por encabezado
    const errors: string[] = [];

    // Resolver questionnaire_id
    const qIdRaw =
      r['cuestionario_id'] ||
      r['id_cuestionario'] ||
      r['questionnaire_id'] ||
      r['cuestionario'] ||
      '';
    let questionnaireId = qIdRaw ? parseInt(qIdRaw, 10) : undefined;
    if ((!questionnaireId || isNaN(questionnaireId)) && fallbackQuestionnaireId) {
      questionnaireId = fallbackQuestionnaireId;
    }

    if (!questionnaireId || isNaN(questionnaireId)) {
      errors.push('Falta el ID del cuestionario (indícalo en la columna o selecciónalo arriba).');
    }

    // Texto de la pregunta
    const questionText =
      r['pregunta'] ||
      r['texto_pregunta'] ||
      r['question'] ||
      r['question_text'] ||
      r['enunciado'] ||
      '';
    if (!questionText) {
      errors.push('El texto de la pregunta está vacío.');
    }

    // Opciones A, B, C, D
    const optionA = r['opcion_a'] || r['respuesta_a'] || r['option_a'] || r['a'] || '';
    const optionB = r['opcion_b'] || r['respuesta_b'] || r['option_b'] || r['b'] || '';
    const optionC = r['opcion_c'] || r['respuesta_c'] || r['option_c'] || r['c'] || '';
    const optionD = r['opcion_d'] || r['respuesta_d'] || r['option_d'] || r['d'] || '';

    if (!optionA) errors.push('Falta la opción A.');
    if (!optionB) errors.push('Falta la opción B.');
    if (!optionC) errors.push('Falta la opción C.');
    if (!optionD) errors.push('Falta la opción D.');

    // Opción correcta
    const correctRaw = (
      r['respuesta_correcta'] ||
      r['opcion_correcta'] ||
      r['correcta'] ||
      r['correct_option'] ||
      r['clave'] ||
      ''
    ).toUpperCase();

    let correctOption: 'A' | 'B' | 'C' | 'D' = 'A';
    if (!['A', 'B', 'C', 'D'].includes(correctRaw)) {
      errors.push(
        `Opción correcta inválida ("${correctRaw || 'vacía'}"). Debe ser A, B, C o D.`
      );
    } else {
      correctOption = correctRaw as 'A' | 'B' | 'C' | 'D';
    }

    return {
      rowNumber,
      questionnaire_id: questionnaireId,
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correctOption,
      isValid: errors.length === 0,
      errors,
    };
  });
}

/**
 * Valida y estructura las filas de Cuestionarios.
 */
export function validateQuestionnaireRows(rows: RawRow[]): ParsedQuestionnaireRow[] {
  return rows.map((rawRow, idx) => {
    const r = normalizeRow(rawRow);
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const catIdRaw =
      r['categoria_id'] ||
      r['id_categoria'] ||
      r['category_id'] ||
      r['categoria'] ||
      '';
    const categoryId = parseInt(catIdRaw, 10);
    if (!catIdRaw || isNaN(categoryId) || categoryId <= 0) {
      errors.push('Falta un ID de categoría numérico válido.');
    }

    const numRaw =
      r['numero'] ||
      r['numero_cuestionario'] ||
      r['cuestionario_numero'] ||
      r['questionnaire_number'] ||
      '';
    const questionnaireNumber = parseInt(numRaw, 10);
    if (!numRaw || isNaN(questionnaireNumber) || questionnaireNumber <= 0) {
      errors.push('Falta un número de cuestionario válido.');
    }

    return {
      rowNumber,
      category_id: categoryId,
      questionnaire_number: questionnaireNumber,
      isValid: errors.length === 0,
      errors,
    };
  });
}

/**
 * Valida y estructura las filas de Categorías.
 */
export function validateCategoryRows(rows: RawRow[]): ParsedCategoryRow[] {
  return rows.map((rawRow, idx) => {
    const r = normalizeRow(rawRow);
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const name =
      r['nombre'] ||
      r['name'] ||
      r['categoria'] ||
      r['nombre_categoria'] ||
      '';
    if (!name) {
      errors.push('El nombre de la categoría es obligatorio.');
    }

    return {
      rowNumber,
      name,
      isValid: errors.length === 0,
      errors,
    };
  });
}

/**
 * Descarga una plantilla ejemplo en formato CSV o XLSX.
 */
export function downloadTemplate(type: EntityType, format: 'csv' | 'xlsx'): void {
  let sampleData: Record<string, string | number>[] = [];
  let fileName = '';

  if (type === 'questions') {
    fileName = 'plantilla_preguntas_sesamo';
    sampleData = [
      {
        cuestionario_id: 1,
        pregunta: '¿Cuál es la función principal de los glóbulos rojos en la sangre?',
        opcion_a: 'Transportar oxígeno hacia los tejidos',
        opcion_b: 'Combatir infecciones virales',
        opcion_c: 'Generar coagulación inmediata',
        opcion_d: 'Filtrar toxinas en el hígado',
        respuesta_correcta: 'A',
      },
      {
        cuestionario_id: 1,
        pregunta: '¿Cuál es el planeta más cercano al Sol en el Sistema Solar?',
        opcion_a: 'Venus',
        opcion_b: 'Marte',
        opcion_c: 'Mercurio',
        opcion_d: 'Júpiter',
        respuesta_correcta: 'C',
      },
      {
        cuestionario_id: 1,
        pregunta: 'Si un triángulo tiene ángulos de 90° y 45°, ¿cuánto mide el tercer ángulo?',
        opcion_a: '30°',
        opcion_b: '45°',
        opcion_c: '60°',
        opcion_d: '90°',
        respuesta_correcta: 'B',
      },
    ];
  } else if (type === 'questionnaires') {
    fileName = 'plantilla_cuestionarios_sesamo';
    sampleData = [
      {
        categoria_id: 1,
        numero_cuestionario: 1,
      },
      {
        categoria_id: 1,
        numero_cuestionario: 2,
      },
      {
        categoria_id: 2,
        numero_cuestionario: 1,
      },
    ];
  } else if (type === 'categories') {
    fileName = 'plantilla_categorias_sesamo';
    sampleData = [
      { nombre: 'Matemáticas' },
      { nombre: 'Ciencias Naturales' },
      { nombre: 'Comprensión Lectora' },
      { nombre: 'Historia Universal' },
    ];
  }

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } else {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }
}
