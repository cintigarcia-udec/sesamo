import React, { useEffect, useRef, useState } from 'react';
import {
  createAnswerOption,
  createCategory,
  createQuestion,
  createQuestionnaire,
  getCategories,
  getQuestionnaires,
  getStoredToken,
  parseJwt,
} from '../services/api';
import {
  downloadTemplate,
  parseFileToRawRows,
  validateCategoryRows,
  validateQuestionnaireRows,
  validateQuestionRows,
} from '../services/fileParser';
import type {
  CategoryItem,
  EntityType,
  ParsedCategoryRow,
  ParsedQuestionnaireRow,
  ParsedQuestionRow,
  QuestionnaireItem,
  UploadLogItem,
  UploadProgress,
} from '../types/bulk';

interface BulkUploaderProps {
  authKey: number; // Incrementado cuando cambia la autenticación
}

export const BulkUploader: React.FC<BulkUploaderProps> = ({ authKey }) => {
  const [activeTab, setActiveTab] = useState<EntityType>('questions');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datos existentes en la base de datos
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<number | undefined>(undefined);

  // Filas validadas según la pestaña activa
  const [questionRows, setQuestionRows] = useState<ParsedQuestionRow[]>([]);
  const [questionnaireRows, setQuestionnaireRows] = useState<ParsedQuestionnaireRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<ParsedCategoryRow[]>([]);

  // Filtro de tabla: 'all' | 'valid' | 'invalid'
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');

  // Estado del proceso de carga
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    current: 0,
    successful: 0,
    failed: 0,
    inProgress: false,
    isComplete: false,
    currentMessage: '',
  });
  const [logs, setLogs] = useState<UploadLogItem[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const token = getStoredToken();
  const userData = token ? parseJwt(token) : null;
  const isAdmin = userData?.role_id === 1;

  // Cargar categorías y cuestionarios existentes
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!token) return;
      try {
        const [cats, qs] = await Promise.all([
          getCategories().catch(() => []),
          getQuestionnaires().catch(() => []),
        ]);
        if (isMounted) {
          setCategories(cats);
          setQuestionnaires(qs);
          setSelectedQuestionnaireId((prev) => (prev === undefined && qs.length > 0 ? qs[0].id : prev));
        }
      } catch {
        // Ignorar si aún no hay conexión
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [authKey, token]);

  // Limpiar archivo y preview al cambiar de pestaña
  const handleTabChange = (tab: EntityType) => {
    setActiveTab(tab);
    setFile(null);
    setQuestionRows([]);
    setQuestionnaireRows([]);
    setCategoryRows([]);
    setParseError(null);
    setProgress({
      total: 0,
      current: 0,
      successful: 0,
      failed: 0,
      inProgress: false,
      isComplete: false,
      currentMessage: '',
    });
    setLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Procesar archivo seleccionado
  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setParseError(null);
    setProgress({
      total: 0,
      current: 0,
      successful: 0,
      failed: 0,
      inProgress: false,
      isComplete: false,
      currentMessage: '',
    });
    setLogs([]);

    try {
      const rawRows = await parseFileToRawRows(uploadedFile);

      if (activeTab === 'questions') {
        const validated = validateQuestionRows(rawRows, selectedQuestionnaireId);
        setQuestionRows(validated);
      } else if (activeTab === 'questionnaires') {
        const validated = validateQuestionnaireRows(rawRows);
        setQuestionnaireRows(validated);
      } else if (activeTab === 'categories') {
        const validated = validateCategoryRows(rawRows);
        setCategoryRows(validated);
      }
    } catch (err) {
      setParseError((err as Error).message);
      setQuestionRows([]);
      setQuestionnaireRows([]);
      setCategoryRows([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  // Re-validar si cambia el cuestionario por defecto
  const handleDefaultQuestionnaireChange = (newQId: number) => {
    setSelectedQuestionnaireId(newQId);
    if (activeTab === 'questions' && questionRows.length > 0) {
      // Re-evaluar filas de preguntas con el nuevo fallback
      const revalidated = questionRows.map((row) => {
        const currentQId = row.questionnaire_id || newQId;
        const errors = [...row.errors].filter(
          (err) => !err.includes('Falta el ID del cuestionario')
        );
        if (!currentQId) {
          errors.push('Falta el ID del cuestionario.');
        }
        return {
          ...row,
          questionnaire_id: currentQId,
          isValid: errors.length === 0,
          errors,
        };
      });
      setQuestionRows(revalidated);
    }
  };

  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, type, message }]);
  };

  // Ejecución de la Carga Masiva
  const handleExecuteUpload = async () => {
    if (!isAdmin) {
      alert('Debes iniciar sesión con una cuenta de Administrador para realizar cargas.');
      return;
    }

    if (activeTab === 'questions') {
      const validRows = questionRows.filter((r) => r.isValid);
      if (validRows.length === 0) return;

      setProgress({
        total: validRows.length,
        current: 0,
        successful: 0,
        failed: 0,
        inProgress: true,
        isComplete: false,
        currentMessage: 'Iniciando carga de preguntas...',
      });
      addLog('info', `Iniciando carga masiva de ${validRows.length} preguntas.`);

      let successes = 0;
      let failures = 0;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setProgress((prev) => ({
          ...prev,
          current: i + 1,
          currentMessage: `Fila ${row.rowNumber}: Creando pregunta "${row.question_text.slice(0, 30)}..."`,
        }));

        try {
          // 1. Crear Pregunta
          const qRes = await createQuestion({
            question_text: row.question_text,
            questionnaire_id: row.questionnaire_id!,
          });

          // 2. Crear las 4 opciones de respuesta
          const options = [
            { key: 'A', text: row.option_a, isCorrect: row.correct_option === 'A' },
            { key: 'B', text: row.option_b, isCorrect: row.correct_option === 'B' },
            { key: 'C', text: row.option_c, isCorrect: row.correct_option === 'C' },
            { key: 'D', text: row.option_d, isCorrect: row.correct_option === 'D' },
          ];

          for (const opt of options) {
            await createAnswerOption({
              question_id: qRes.id,
              option_key: opt.key,
              answer: opt.text,
              is_correct: opt.isCorrect,
            });
          }

          successes++;
          addLog('success', `Fila ${row.rowNumber}: Pregunta #${qRes.id} y 4 opciones creadas con éxito.`);
        } catch (err) {
          failures++;
          addLog('error', `Fila ${row.rowNumber}: Error al crear pregunta: ${(err as Error).message}`);
        }

        setProgress((prev) => ({
          ...prev,
          successful: successes,
          failed: failures,
        }));
      }

      setProgress((prev) => ({
        ...prev,
        inProgress: false,
        isComplete: true,
        currentMessage: `Carga finalizada: ${successes} exitosas, ${failures} con error.`,
      }));
    } else if (activeTab === 'questionnaires') {
      const validRows = questionnaireRows.filter((r) => r.isValid);
      if (validRows.length === 0) return;

      setProgress({
        total: validRows.length,
        current: 0,
        successful: 0,
        failed: 0,
        inProgress: true,
        isComplete: false,
        currentMessage: 'Iniciando carga de cuestionarios...',
      });
      addLog('info', `Iniciando carga de ${validRows.length} cuestionarios.`);

      let successes = 0;
      let failures = 0;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setProgress((prev) => ({
          ...prev,
          current: i + 1,
          currentMessage: `Fila ${row.rowNumber}: Cuestionario #${row.questionnaire_number} (Categoría ${row.category_id})`,
        }));

        try {
          const res = await createQuestionnaire({
            questionnaire_number: row.questionnaire_number,
            category_id: row.category_id,
          });
          successes++;
          addLog('success', `Fila ${row.rowNumber}: Cuestionario #${res.id} creado.`);
        } catch (err) {
          failures++;
          addLog('error', `Fila ${row.rowNumber}: Error: ${(err as Error).message}`);
        }

        setProgress((prev) => ({
          ...prev,
          successful: successes,
          failed: failures,
        }));
      }

      setProgress((prev) => ({
        ...prev,
        inProgress: false,
        isComplete: true,
        currentMessage: `Finalizado: ${successes} creados, ${failures} con error.`,
      }));
    } else if (activeTab === 'categories') {
      const validRows = categoryRows.filter((r) => r.isValid);
      if (validRows.length === 0) return;

      setProgress({
        total: validRows.length,
        current: 0,
        successful: 0,
        failed: 0,
        inProgress: true,
        isComplete: false,
        currentMessage: 'Iniciando carga de categorías...',
      });
      addLog('info', `Iniciando carga de ${validRows.length} categorías.`);

      let successes = 0;
      let failures = 0;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setProgress((prev) => ({
          ...prev,
          current: i + 1,
          currentMessage: `Fila ${row.rowNumber}: Categoría "${row.name}"`,
        }));

        try {
          const res = await createCategory(row.name);
          successes++;
          addLog('success', `Fila ${row.rowNumber}: Categoría #${res.id} "${res.name}" creada.`);
        } catch (err) {
          failures++;
          addLog('error', `Fila ${row.rowNumber}: Error: ${(err as Error).message}`);
        }

        setProgress((prev) => ({
          ...prev,
          successful: successes,
          failed: failures,
        }));
      }

      setProgress((prev) => ({
        ...prev,
        inProgress: false,
        isComplete: true,
        currentMessage: `Finalizado: ${successes} creadas, ${failures} con error.`,
      }));
    }
  };

  // Filtrado de filas
  const currentTotalRows =
    activeTab === 'questions'
      ? questionRows.length
      : activeTab === 'questionnaires'
        ? questionnaireRows.length
        : categoryRows.length;

  const currentValidCount =
    activeTab === 'questions'
      ? questionRows.filter((r) => r.isValid).length
      : activeTab === 'questionnaires'
        ? questionnaireRows.filter((r) => r.isValid).length
        : categoryRows.filter((r) => r.isValid).length;

  const currentErrorCount = currentTotalRows - currentValidCount;

  return (
    <div className="bulk-container">
      {/* Navegación por Pestañas */}
      <div className="tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => handleTabChange('questions')}
        >
          📝 Preguntas y Respuestas
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'questionnaires' ? 'active' : ''}`}
          onClick={() => handleTabChange('questionnaires')}
        >
          📋 Cuestionarios
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => handleTabChange('categories')}
        >
          🏷️ Categorías
        </button>
      </div>

      {/* Barra de Acciones y Plantillas */}
      <div className="toolbar-card">
        <div className="toolbar-info">
          <h3>
            {activeTab === 'questions' && 'Carga Masiva de Preguntas con Opciones (A, B, C, D)'}
            {activeTab === 'questionnaires' && 'Carga Masiva de Cuestionarios'}
            {activeTab === 'categories' && 'Carga Masiva de Categorías'}
          </h3>
          <p className="toolbar-desc">
            Soporta archivos <strong>.csv</strong> y <strong>.xlsx</strong>. Descarga la plantilla para ver la estructura exacta requerida.
          </p>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className="btn-outline"
            onClick={() => downloadTemplate(activeTab, 'csv')}
          >
            📥 Plantilla CSV
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => downloadTemplate(activeTab, 'xlsx')}
          >
            📥 Plantilla Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Selector de Cuestionario Predeterminado (solo para preguntas) */}
      {activeTab === 'questions' && (
        <div className="options-card">
          <label htmlFor="select-q">
            <strong>Cuestionario Destino Predeterminado:</strong>
          </label>
          <div className="select-wrapper">
            <select
              id="select-q"
              value={selectedQuestionnaireId || ''}
              onChange={(e) => handleDefaultQuestionnaireChange(Number(e.target.value))}
            >
              {questionnaires.length === 0 ? (
                <option value="">No hay cuestionarios cargados o no hay conexión</option>
              ) : (
                questionnaires.map((q) => (
                  <option key={q.id} value={q.id}>
                    ID {q.id} - Cuestionario #{q.questionnaire_number}{' '}
                    {q.category_name ? `(${q.category_name})` : ''}
                  </option>
                ))
              )}
            </select>
            <span className="field-hint">
              Se usará para filas donde la columna <code>cuestionario_id</code> esté vacía.
            </span>
          </div>
        </div>
      )}

      {/* Referencia de categorías para cuestionarios */}
      {activeTab === 'questionnaires' && categories.length > 0 && (
        <div className="options-card">
          <strong>Categorías Disponibles en la BD:</strong>
          <div className="tags-container">
            {categories.map((c) => (
              <span key={c.id} className="category-tag">
                ID {c.id}: {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Referencia de categorías existentes en pestaña categorías */}
      {activeTab === 'categories' && categories.length > 0 && (
        <div className="options-card">
          <strong>Categorías registradas actualmente ({categories.length}):</strong>
          <div className="tags-container">
            {categories.map((c) => (
              <span key={c.id} className="category-tag">
                {c.name} (ID {c.id})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Zona de Arrastrar y Soltar */}
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div className="dropzone-content">
          <span className="dropzone-icon">📄</span>
          {file ? (
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-meta">
                {(file.size / 1024).toFixed(1)} KB · Haz clic o arrastra otro archivo para cambiar
              </span>
            </div>
          ) : (
            <div>
              <p className="dropzone-title">
                Arrastra tu archivo <strong>.csv</strong> o <strong>.xlsx</strong> aquí
              </p>
              <p className="dropzone-sub">o haz clic para explorar tus archivos</p>
            </div>
          )}
        </div>
      </div>

      {/* Error de lectura */}
      {parseError && <div className="error-banner">⚠️ {parseError}</div>}

      {/* Previsualización y Validación */}
      {currentTotalRows > 0 && (
        <div className="preview-card">
          <div className="preview-header">
            <div className="metrics-group">
              <span className="metric-pill">
                Total: <strong>{currentTotalRows}</strong>
              </span>
              <span className="metric-pill valid">
                ✓ Válidos: <strong>{currentValidCount}</strong>
              </span>
              {currentErrorCount > 0 && (
                <span className="metric-pill invalid">
                  ✕ Errores: <strong>{currentErrorCount}</strong>
                </span>
              )}
            </div>

            <div className="filter-group">
              <button
                type="button"
                className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                Todos
              </button>
              <button
                type="button"
                className={`filter-btn ${filterMode === 'valid' ? 'active' : ''}`}
                onClick={() => setFilterMode('valid')}
              >
                Solo Válidos
              </button>
              <button
                type="button"
                className={`filter-btn ${filterMode === 'invalid' ? 'active' : ''}`}
                onClick={() => setFilterMode('invalid')}
              >
                Solo Errores
              </button>
            </div>
          </div>

          {/* Tabla de Preguntas */}
          {activeTab === 'questions' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Estado</th>
                    <th>Q_ID</th>
                    <th>Pregunta</th>
                    <th>Opción A</th>
                    <th>Opción B</th>
                    <th>Opción C</th>
                    <th>Opción D</th>
                    <th>Correcta</th>
                  </tr>
                </thead>
                <tbody>
                  {questionRows
                    .filter((r) =>
                      filterMode === 'valid'
                        ? r.isValid
                        : filterMode === 'invalid'
                          ? !r.isValid
                          : true
                    )
                    .slice(0, 50)
                    .map((r) => (
                      <tr key={r.rowNumber} className={r.isValid ? 'row-valid' : 'row-error'}>
                        <td>{r.rowNumber}</td>
                        <td>
                          {r.isValid ? (
                            <span className="status-badge valid">Válido</span>
                          ) : (
                            <span
                              className="status-badge invalid"
                              title={r.errors.join(' | ')}
                            >
                              Error ⚠️
                            </span>
                          )}
                        </td>
                        <td>{r.questionnaire_id || '—'}</td>
                        <td className="text-col">{r.question_text || '—'}</td>
                        <td className="text-col">{r.option_a || '—'}</td>
                        <td className="text-col">{r.option_b || '—'}</td>
                        <td className="text-col">{r.option_c || '—'}</td>
                        <td className="text-col">{r.option_d || '—'}</td>
                        <td className="center-col">
                          <strong>{r.correct_option}</strong>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {questionRows.length > 50 && (
                <p className="table-footer-hint">
                  Mostrando las primeras 50 de {questionRows.length} filas.
                </p>
              )}
            </div>
          )}

          {/* Tabla de Cuestionarios */}
          {activeTab === 'questionnaires' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Estado</th>
                    <th>Categoría ID</th>
                    <th>Número Cuestionario</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {questionnaireRows
                    .filter((r) =>
                      filterMode === 'valid'
                        ? r.isValid
                        : filterMode === 'invalid'
                          ? !r.isValid
                          : true
                    )
                    .slice(0, 50)
                    .map((r) => (
                      <tr key={r.rowNumber} className={r.isValid ? 'row-valid' : 'row-error'}>
                        <td>{r.rowNumber}</td>
                        <td>
                          {r.isValid ? (
                            <span className="status-badge valid">Válido</span>
                          ) : (
                            <span className="status-badge invalid">Error</span>
                          )}
                        </td>
                        <td>{r.category_id || '—'}</td>
                        <td>{r.questionnaire_number || '—'}</td>
                        <td>{r.errors.join(', ') || 'Listo para cargar'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabla de Categorías */}
          {activeTab === 'categories' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Estado</th>
                    <th>Nombre de Categoría</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows
                    .filter((r) =>
                      filterMode === 'valid'
                        ? r.isValid
                        : filterMode === 'invalid'
                          ? !r.isValid
                          : true
                    )
                    .slice(0, 50)
                    .map((r) => (
                      <tr key={r.rowNumber} className={r.isValid ? 'row-valid' : 'row-error'}>
                        <td>{r.rowNumber}</td>
                        <td>
                          {r.isValid ? (
                            <span className="status-badge valid">Válido</span>
                          ) : (
                            <span className="status-badge invalid">Error</span>
                          )}
                        </td>
                        <td>{r.name || '—'}</td>
                        <td>{r.errors.join(', ') || 'Listo para cargar'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Barra de Ejecución */}
          <div className="execution-panel">
            {!isAdmin && (
              <div className="alert-warning">
                🔒 Inicia sesión como <strong>Admin</strong> arriba para poder enviar los datos a la base de datos.
              </div>
            )}

            <button
              type="button"
              className="btn-upload"
              disabled={currentValidCount === 0 || progress.inProgress || !isAdmin}
              onClick={handleExecuteUpload}
            >
              {progress.inProgress
                ? 'Subiendo registros...'
                : `🚀 Cargar ${currentValidCount} Registros Válidos`}
            </button>
          </div>
        </div>
      )}

      {/* Progreso y Log de Ejecución */}
      {(progress.inProgress || progress.isComplete) && (
        <div className="progress-card">
          <h4>Progreso de la Carga</h4>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="progress-stats">
            <span>{progress.currentMessage}</span>
            <span>
              {progress.current} / {progress.total} (
              {progress.total > 0
                ? Math.round((progress.current / progress.total) * 100)
                : 0}
              %)
            </span>
          </div>

          {progress.isComplete && (
            <div className="completion-card">
              <span className="success-icon">🎉</span>
              <div>
                <strong>Proceso Finalizado</strong>
                <p>
                  Exitosos: <strong>{progress.successful}</strong> · Errores:{' '}
                  <strong>{progress.failed}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Consola de Logs */}
          <div className="logs-console">
            {logs.map((log, i) => (
              <div key={i} className={`log-line ${log.type}`}>
                <span className="log-time">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
