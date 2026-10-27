import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAnswerOption,
  createCategory,
  createQuestion,
  createQuestionnaire,
  getApiBaseUrl,
  getCategories,
  getQuestionnaires,
  getStoredToken,
  login,
  parseJwt,
  setApiBaseUrl,
  setStoredToken,
} from '../services/api';

describe('api service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Configuration & Storage', () => {
    it('returns default API base URL when none is stored', () => {
      const url = getApiBaseUrl();
      expect(url).toBe('http://127.0.0.1:8000');
    });

    it('sets and gets custom API base URL, trimming trailing slashes', () => {
      setApiBaseUrl('https://api.sesamo.edu.co///');
      expect(getApiBaseUrl()).toBe('https://api.sesamo.edu.co');
      expect(localStorage.getItem('sesamo_api_url')).toBe('https://api.sesamo.edu.co');
    });

    it('stores and retrieves JWT tokens in localStorage', () => {
      expect(getStoredToken()).toBeNull();
      setStoredToken('sample.token.value');
      expect(getStoredToken()).toBe('sample.token.value');
      setStoredToken(null);
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('parseJwt', () => {
    it('decodes standard payload correctly', () => {
      const payload = {
        sub: 'profesor@sesamo.com',
        name: 'Carlos',
        last_name: 'Pérez',
        role_id: 1,
      };
      const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.sig`;
      const parsed = parseJwt(token);

      expect(parsed).toEqual({
        email: 'profesor@sesamo.com',
        name: 'Carlos Pérez',
        role_id: 1,
      });
    });

    it('handles base64url characters (- and _) in token payload', () => {
      const payload = { sub: 'test@example.com', role_id: 2 };
      const base64 = Buffer.from(JSON.stringify(payload))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      const token = `hdr.${base64}.sig`;

      const parsed = parseJwt(token);
      expect(parsed?.email).toBe('test@example.com');
      expect(parsed?.role_id).toBe(2);
    });

    it('returns null for invalid or corrupted token string', () => {
      expect(parseJwt('not-a-token')).toBeNull();
      expect(parseJwt('a.corrupted_json_payload.c')).toBeNull();
      expect(parseJwt('')).toBeNull();
    });
  });

  describe('API endpoints', () => {
    it('login sends credentials, stores access token, and returns payload', async () => {
      const fakeToken = 'header.payload.signature';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ access_token: fakeToken, token_type: 'bearer' }),
      });
      globalThis.fetch = mockFetch;

      const res = await login('admin@sesamo.com', 'admin123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'admin@sesamo.com', password: 'admin123' }),
        })
      );
      expect(res.access_token).toBe(fakeToken);
      expect(getStoredToken()).toBe(fakeToken);
    });

    it('getCategories attaches Authorization header when token exists', async () => {
      setStoredToken('my-auth-token');
      const mockCategories = [{ id: 1, name: 'Ciencias' }];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCategories,
      });
      globalThis.fetch = mockFetch;

      const data = await getCategories();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/categories/?skip=0&limit=500',
        expect.objectContaining({
          method: 'GET',
        })
      );
      const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(callHeaders.get('Authorization')).toBe('Bearer my-auth-token');
      expect(data).toEqual(mockCategories);
    });

    it('getQuestionnaires fetches questionnaires list', async () => {
      const mockQ = [{ id: 10, category_id: 1, questionnaire_number: 1 }];
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockQ,
      });

      const data = await getQuestionnaires();
      expect(data).toEqual(mockQ);
    });

    it('createCategory sends POST with category name', async () => {
      const mockItem = { id: 2, name: 'Física' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockItem,
      });
      globalThis.fetch = mockFetch;

      const result = await createCategory('Física');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/categories/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Física' }),
        })
      );
      expect(result).toEqual(mockItem);
    });

    it('createQuestionnaire sends questionnaire creation request', async () => {
      const payload = { category_id: 1, questionnaire_number: 3 };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 5, ...payload }),
      });
      globalThis.fetch = mockFetch;

      const res = await createQuestionnaire(payload);
      expect(res.id).toBe(5);
    });

    it('createQuestion sends question creation request', async () => {
      const payload = { question_text: '¿Cuánto es 2+2?', questionnaire_id: 5 };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 25, ...payload }),
      });
      globalThis.fetch = mockFetch;

      const res = await createQuestion(payload);
      expect(res.id).toBe(25);
    });

    it('createAnswerOption sends option creation request', async () => {
      const payload = {
        question_id: 25,
        answer: '4',
        option_key: 'A',
        is_correct: true,
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 100, ...payload }),
      });
      globalThis.fetch = mockFetch;

      const res = await createAnswerOption(payload);
      expect(res.id).toBe(100);
    });

    it('handles HTTP error responses and surfaces error detail message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'Solo administradores pueden realizar esta acción' }),
      });

      await expect(getCategories()).rejects.toThrow(
        'Solo administradores pueden realizar esta acción'
      );
    });

    it('handles network connection error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(getCategories()).rejects.toThrow(
        'Error de conexión con la API'
      );
    });
  });
});
