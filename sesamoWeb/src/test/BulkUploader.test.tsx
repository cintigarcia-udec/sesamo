import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkUploader } from '../components/BulkUploader';
import * as api from '../services/api';
import * as fileParser from '../services/fileParser';

describe('<BulkUploader />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'getCategories').mockResolvedValue([
      { id: 1, name: 'Ciencias' },
      { id: 2, name: 'Matemáticas' },
    ]);
    vi.spyOn(api, 'getQuestionnaires').mockResolvedValue([
      { id: 10, category_id: 1, questionnaire_number: 1 },
    ]);
  });

  const createFakeToken = (payload: Record<string, unknown>) => {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  it('renders entity tabs and initial questions header', async () => {
    const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
    vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

    render(<BulkUploader authKey={1} />);
    await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /Preguntas y Respuestas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cuestionarios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Categorías/i })).toBeInTheDocument();

    expect(
      screen.getByText(/Carga Masiva de Preguntas con Opciones/i)
    ).toBeInTheDocument();
  });

  it('switches tabs and updates active toolbar description', async () => {
    const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
    vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

    render(<BulkUploader authKey={1} />);
    await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

    const categoriesTab = screen.getByRole('button', { name: /Categorías/i });
    fireEvent.click(categoriesTab);

    expect(screen.getByText('Carga Masiva de Categorías')).toBeInTheDocument();

    const questionnairesTab = screen.getByRole('button', { name: /Cuestionarios/i });
    fireEvent.click(questionnairesTab);

    expect(screen.getByText('Carga Masiva de Cuestionarios')).toBeInTheDocument();
  });

  it('triggers downloadTemplate when clicking download template buttons', async () => {
    const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
    vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);
    const downloadSpy = vi.spyOn(fileParser, 'downloadTemplate').mockImplementation(() => {});

    render(<BulkUploader authKey={1} />);
    await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

    const csvBtn = screen.getByRole('button', { name: /Plantilla CSV/i });
    fireEvent.click(csvBtn);
    expect(downloadSpy).toHaveBeenCalledWith('questions', 'csv');

    const xlsxBtn = screen.getByRole('button', { name: /Plantilla Excel/i });
    fireEvent.click(xlsxBtn);
    expect(downloadSpy).toHaveBeenCalledWith('questions', 'xlsx');
  });

  it('processes parsed category rows and completes upload execution', async () => {
    const adminToken = createFakeToken({ sub: 'admin@sesamo.com', role_id: 1 });
    vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);
    vi.spyOn(api, 'createCategory').mockResolvedValue({ id: 99, name: 'Filosofía' });

    vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([
      { nombre: 'Filosofía' },
    ]);

    render(<BulkUploader authKey={1} />);
    await waitFor(() => expect(api.getCategories).toHaveBeenCalled());

    // Switch to categories tab
    fireEvent.click(screen.getByRole('button', { name: /Categorías/i }));

    // Simulate file input
    const file = new File(['nombre\nFilosofía'], 'categorias.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [file] } });

    // Verify row preview is shown
    await waitFor(() => {
      expect(screen.getByText('Filosofía')).toBeInTheDocument();
      expect(screen.getByText('Válido')).toBeInTheDocument();
    });

    // Start upload
    const startBtn = screen.getByRole('button', { name: /Cargar 1 Registros Válidos/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(api.createCategory).toHaveBeenCalledWith('Filosofía');
      expect(screen.getByText(/Finalizado: 1 creadas/i)).toBeInTheDocument();
    });
  });
});
