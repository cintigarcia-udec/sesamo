import type { CategoryItem, QuestionnaireItem } from '../types/bulk';

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const STORAGE_KEY_TOKEN = 'sesamo_access_token';
const STORAGE_KEY_API_URL = 'sesamo_api_url';

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem(STORAGE_KEY_API_URL);
  return (custom || DEFAULT_API_URL).replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_API_URL, url.trim().replace(/\/+$/, ''));
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}

export function parseJwt(token: string): { email?: string; name?: string; role_id?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      email: parsed.sub || parsed.email,
      name: parsed.name ? `${parsed.name} ${parsed.last_name || ''}`.trim() : undefined,
      role_id: parsed.role_id,
    };
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ensure leading slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(`Error de conexión con la API en ${url}: ${(err as Error).message}`);
  }

  if (!res.ok) {
    let detail = `Error HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        detail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // If not JSON, use status text
      detail = res.statusText || detail;
    }
    throw new Error(detail);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
  const data = await request<{ access_token: string; token_type: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredToken(data.access_token);
  return data;
}

export async function getCategories(): Promise<CategoryItem[]> {
  return request<CategoryItem[]>('/categories/?skip=0&limit=500', { method: 'GET' });
}

export async function getQuestionnaires(): Promise<QuestionnaireItem[]> {
  return request<QuestionnaireItem[]>('/questionnaires/?skip=0&limit=500', { method: 'GET' });
}

export async function createCategory(name: string): Promise<CategoryItem> {
  return request<CategoryItem>('/categories/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function createQuestionnaire(data: {
  questionnaire_number: number;
  category_id: number;
}): Promise<QuestionnaireItem> {
  return request<QuestionnaireItem>('/questionnaires/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createQuestion(data: {
  question_text: string;
  questionnaire_id: number;
}): Promise<{ id: number; question_text: string; questionnaire_id: number }> {
  return request<{ id: number; question_text: string; questionnaire_id: number }>('/questions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createAnswerOption(data: {
  answer: string;
  option_key: string;
  question_id: number;
  is_correct: boolean;
}): Promise<{ id: number; answer: string; option_key: string; question_id: number }> {
  return request<{ id: number; answer: string; option_key: string; question_id: number }>('/answer-options/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
