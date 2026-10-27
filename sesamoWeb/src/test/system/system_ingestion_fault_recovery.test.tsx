import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkUploader } from '../../components/BulkUploader';
import * as api from '../../services/api';
import * as fileParser from '../../services/fileParser';

describe('SYSTEM TEST: Resiliencia y Aislamiento de Fallos en Carga Masiva', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'getCategories').mockResolvedValue([]);
    vi.spyOn(api, 'getQuestionnaires').mockResolvedValue([]);
  });

  const createAdminToken = () => {
    const payload = { sub: 'admin@sesamo.com', role_id: 1, name: 'Admin' };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  it('procesa lotes con fallos parciales: registra error en auditoría, continúa con los registros restantes y resume el resultado', async () => {
    const adminToken = createAdminToken();
    vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

    // Mock donde el primer registro falla con 400 y el segundo prospera
    const createCatSpy = vi
      .spyOn(api, 'createCategory')
      .mockRejectedValueOnce(new Error('La categoría ya existe en la base de datos.'))
      .mockResolvedValueOnce({ id: 88, name: 'Astronomía Moderna' });

    vi.spyOn(fileParser, 'parseFileToRawRows').mockResolvedValue([
      { nombre: 'Física Duplicada' },
      { nombre: 'Astronomía Moderna' },
    ]);

    render(<BulkUploader authKey={1} />);

    // 1. Cambiar a la pestaña de Categorías
    const catTab = screen.getByRole('button', { name: /Categorías/i });
    fireEvent.click(catTab);

    // 2. Simular archivo cargado
    const file = new File(['nombre\nFísica Duplicada\nAstronomía Moderna'], 'categorias.csv', {
      type: 'text/csv',
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 3. Confirmar que se detectaron 2 registros válidos en preview
    expect(await screen.findByText('Física Duplicada')).toBeInTheDocument();
    expect(screen.getByText('Astronomía Moderna')).toBeInTheDocument();

    // 4. Iniciar la carga
    const uploadBtn = screen.getByRole('button', { name: /Cargar 2 Registros Válidos/i });
    fireEvent.click(uploadBtn);

    // 5. El sistema no colapsa: intentó crear ambos registros
    await waitFor(() => {
      expect(createCatSpy).toHaveBeenCalledTimes(2);
    });

    // 6. Se muestra el balance exacto en la barra de progreso
    await waitFor(() => {
      expect(screen.getByText(/Finalizado: 1 creadas, 1 con error/i)).toBeInTheDocument();
    });

    // 7. El panel de auditoría registra el error específico de la fila 2
    expect(screen.getByText(/Error: La categoría ya existe en la base de datos/i)).toBeInTheDocument();
    expect(screen.getByText(/Categoría #88 "Astronomía Moderna" creada/i)).toBeInTheDocument();
  });
});
