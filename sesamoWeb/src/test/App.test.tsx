import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as api from '../services/api';

describe('<App />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'getCategories').mockResolvedValue([]);
    vi.spyOn(api, 'getQuestionnaires').mockResolvedValue([]);
  });

  const createFakeToken = (payload: Record<string, unknown>) => {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
  };

  it('renders LoginScreen when there is no stored token', () => {
    vi.spyOn(api, 'getStoredToken').mockReturnValue(null);

    render(<App />);

    expect(screen.getByRole('button', { name: /Ingresar al Portal/i })).toBeInTheDocument();
    expect(screen.queryByText(/Módulo de Carga Masiva/i)).not.toBeInTheDocument();
  });

  it('renders LoginScreen when stored token is for a student (role_id: 2)', () => {
    const studentToken = createFakeToken({
      sub: 'alumno@sesamo.com',
      role_id: 2,
    });
    vi.spyOn(api, 'getStoredToken').mockReturnValue(studentToken);

    render(<App />);

    expect(screen.getByRole('button', { name: /Ingresar al Portal/i })).toBeInTheDocument();
    expect(screen.queryByText(/Módulo de Carga Masiva/i)).not.toBeInTheDocument();
  });

  it('renders AuthBar and BulkUploader dashboard when stored token is for an admin (role_id: 1)', async () => {
    const adminToken = createFakeToken({
      sub: 'admin@sesamo.com',
      role_id: 1,
    });
    vi.spyOn(api, 'getStoredToken').mockReturnValue(adminToken);

    render(<App />);

    expect(await screen.findByText('🛡️ Admin')).toBeInTheDocument();
    expect(screen.getByText(/Módulo de Carga Masiva/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salir/i })).toBeInTheDocument();
    await waitFor(() => expect(api.getCategories).toHaveBeenCalled());
  });
});
