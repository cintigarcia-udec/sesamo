import * as SecureStore from "expo-secure-store";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

const ACCESS_TOKEN_KEY = "sesamo.access_token";
const REFRESH_TOKEN_KEY = "sesamo.refresh_token";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

export type JwtPayload = Record<string, unknown>;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  const atobFn = (globalThis as unknown as { atob?: (s: string) => string })
    .atob;
  if (atobFn) return atobFn(padded);

  const bufferCtor = (globalThis as unknown as { Buffer?: any }).Buffer;
  if (bufferCtor?.from) {
    return bufferCtor.from(padded, "base64").toString("binary");
  }

  throw new Error("Base64 decode not available");
}

export function getJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const binary = decodeBase64Url(parts[1]!);

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decoder = (globalThis as unknown as { TextDecoder?: any })
      .TextDecoder;
    const json = decoder
      ? new decoder("utf-8").decode(bytes)
      : decodeURIComponent(
          Array.from(bytes)
            .map((b) => `%${b.toString(16).padStart(2, "0")}`)
            .join(""),
        );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

const ROLE_NAME_TO_ID: Record<string, number> = {
  Administrador: 1,
  Admin: 1,
  administrador: 1,
  admin: 1,
  Docente: 3,
  docente: 3,
  Estudiante: 2,
  estudiante: 2,
};

export function getJwtRoleId(token: string): string | number | null {
  const payload = getJwtPayload(token);
  console.log("[JWT DEBUG] Raw payload:", payload);

  const record = payload as {
    role_id?: unknown;
    roleId?: unknown;
    role?: unknown;
    roles?: unknown;
  } | null;

  const roleValue = record?.role;
  console.log("[JWT DEBUG] role value:", roleValue, "type:", typeof roleValue);

  if (typeof roleValue === "string") {
    const trimmed = roleValue.trim();
    console.log(
      "[JWT DEBUG] role trimmed:",
      trimmed,
      "lookup in map:",
      ROLE_NAME_TO_ID[trimmed],
    );
    if (ROLE_NAME_TO_ID[trimmed]) {
      return ROLE_NAME_TO_ID[trimmed];
    }
    return trimmed;
  }

  const direct = record?.role_id ?? record?.roleId ?? (record as any)?.roleID;
  if (typeof direct === "string" || typeof direct === "number") return direct;

  const roleObj = record?.role;
  if (
    typeof roleObj === "object" &&
    roleObj !== null &&
    !Array.isArray(roleObj)
  ) {
    const id =
      (roleObj as any).id ??
      (roleObj as any).role_id ??
      (roleObj as any).roleId;
    if (typeof id === "string" || typeof id === "number") return id;
  }

  const roles = record?.roles;
  if (Array.isArray(roles) && roles.length > 0) {
    const first = roles[0];
    if (typeof first === "string" || typeof first === "number") return first;
    if (typeof first === "object" && first !== null && !Array.isArray(first)) {
      const id =
        (first as any).id ?? (first as any).role_id ?? (first as any).roleId;
      if (typeof id === "string" || typeof id === "number") return id;
    }
  }

  return null;
}

export function getJwtUserId(token: string): number | null {
  const payload = getJwtPayload(token);
  const record = payload as {
    user_id?: unknown;
    userId?: unknown;
    id?: unknown;
    sub?: unknown;
    user?: unknown;
  } | null;

  const candidates: unknown[] = [
    record?.user_id,
    record?.userId,
    record?.id,
    (record as any)?.uid,
    (record as any)?.userID,
    isRecord(record?.user) ? (record?.user as any).id : undefined,
    isRecord(record?.user) ? (record?.user as any).user_id : undefined,
    isRecord(record?.user) ? (record?.user as any).userId : undefined,
    record?.sub,
  ];

  for (const raw of candidates) {
    const num =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (Number.isFinite(num)) return num;
  }

  return null;
}

async function secureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

function getInMemoryToken(
  key: typeof ACCESS_TOKEN_KEY | typeof REFRESH_TOKEN_KEY,
) {
  const map = (globalThis as any).__SESAMO_TOKENS__ as
    | Record<string, string | undefined>
    | undefined;
  return map?.[key];
}

function setInMemoryToken(
  key: typeof ACCESS_TOKEN_KEY | typeof REFRESH_TOKEN_KEY,
  value: string | null,
) {
  const g = globalThis as any;
  if (!g.__SESAMO_TOKENS__) g.__SESAMO_TOKENS__ = {};
  if (value) g.__SESAMO_TOKENS__[key] = value;
  else delete g.__SESAMO_TOKENS__[key];
}

export async function getStoredAccessToken() {
  const inMemory = getInMemoryToken(ACCESS_TOKEN_KEY);
  if (inMemory) return inMemory;

  if (process.env.EXPO_OS === "web") {
    try {
      const stored = (globalThis as any).localStorage?.getItem(
        ACCESS_TOKEN_KEY,
      );
      return typeof stored === "string" ? stored : null;
    } catch {
      return null;
    }
  }

  const available = await secureStoreAvailable();
  if (!available) return null;
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredAccessToken(token: string) {
  setInMemoryToken(ACCESS_TOKEN_KEY, token);
  (globalThis as any).__SESAMO_JWT_PAYLOAD__ = getJwtPayload(token);

  if (process.env.EXPO_OS === "web") {
    try {
      (globalThis as any).localStorage?.setItem(ACCESS_TOKEN_KEY, token);
    } catch {
      return;
    }
    return;
  }

  const available = await secureStoreAvailable();
  if (!available) return;
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch {
    return;
  }
}

export async function clearStoredAccessToken() {
  setInMemoryToken(ACCESS_TOKEN_KEY, null);
  delete (globalThis as any).__SESAMO_JWT_PAYLOAD__;

  if (process.env.EXPO_OS === "web") {
    try {
      (globalThis as any).localStorage?.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      return;
    }
    return;
  }

  const available = await secureStoreAvailable();
  if (!available) return;
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return;
  }
}

export async function getStoredRefreshToken() {
  const inMemory = getInMemoryToken(REFRESH_TOKEN_KEY);
  if (inMemory) return inMemory;

  if (process.env.EXPO_OS === "web") {
    try {
      const stored = (globalThis as any).localStorage?.getItem(
        REFRESH_TOKEN_KEY,
      );
      return typeof stored === "string" ? stored : null;
    } catch {
      return null;
    }
  }

  const available = await secureStoreAvailable();
  if (!available) return null;
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredRefreshToken(token: string) {
  setInMemoryToken(REFRESH_TOKEN_KEY, token);

  if (process.env.EXPO_OS === "web") {
    try {
      (globalThis as any).localStorage?.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      return;
    }
    return;
  }

  const available = await secureStoreAvailable();
  if (!available) return;
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch {
    return;
  }
}

export async function clearStoredRefreshToken() {
  setInMemoryToken(REFRESH_TOKEN_KEY, null);

  if (process.env.EXPO_OS === "web") {
    try {
      (globalThis as any).localStorage?.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      return;
    }
    return;
  }

  const available = await secureStoreAvailable();
  if (!available) return;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return;
  }
}

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "server"
  | "invalid_response";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status: number | null;
  details: unknown;

  constructor(opts: {
    message: string;
    kind: ApiErrorKind;
    status?: number | null;
    details?: unknown;
  }) {
    super(opts.message);
    this.kind = opts.kind;
    this.status = typeof opts.status === "number" ? opts.status : null;
    this.details = opts.details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFastApiErrorMessage(data: unknown, status: number) {
  if (status === 401) return "No autorizado. Inicia sesión nuevamente.";
  if (status === 403) return "No tienes permisos para realizar esta acción.";
  if (isRecord(data)) {
    const detail = data.detail;
    if (typeof detail === "string") return detail;
    if (
      Array.isArray(detail) &&
      isRecord(detail[0]) &&
      typeof detail[0].msg === "string"
    ) {
      return detail[0].msg;
    }
  }
  if (status === 404) return "Recurso no encontrado.";
  if (status === 422) return "Datos inválidos. Revisa el formulario.";
  if (status >= 500) return "Error del servidor. Intenta nuevamente.";
  return "Solicitud fallida. Intenta nuevamente.";
}

async function safeReadJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  return (await response.json().catch(() => null)) as unknown;
}

async function buildQuery(
  query?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

type RequestOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: JsonValue;
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function rawRequest(options: RequestOptions) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const query = await buildQuery(options.query);
  const url = `${API_BASE_URL}${options.path}${query}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  if (options.auth !== false) {
    const token = await getStoredAccessToken();
    if (!token) {
      clearTimeout(id);
      throw new ApiError({
        message: "No hay sesión activa.",
        kind: "unauthorized",
        status: 401,
      });
    }
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal
        ? new AbortSignalAny([options.signal, controller.signal])
        : controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    if ((e as { name?: unknown } | null)?.name === "AbortError") {
      throw new ApiError({
        message: "Tiempo de espera agotado.",
        kind: "timeout",
      });
    }
    throw new ApiError({
      message: "No se pudo conectar con el servidor. Revisa tu conexión.",
      kind: "network",
      details: e,
    });
  }
}

class AbortSignalAny extends AbortSignal {
  constructor(signals: AbortSignal[]) {
    super();
    const controller = new AbortController();
    for (const s of signals) {
      if (s.aborted) {
        controller.abort();
        break;
      }
      s.addEventListener(
        "abort",
        () => {
          controller.abort();
        },
        { once: true },
      );
    }
    return controller.signal as any;
  }
}

async function requestJson<T>(
  options: RequestOptions,
  validate: (data: unknown) => data is T,
) {
  const response = await rawRequest(options);
  const data = await safeReadJson(response);

  if (!response.ok) {
    const kind: ApiErrorKind =
      response.status === 401
        ? "unauthorized"
        : response.status === 403
          ? "forbidden"
          : response.status === 404
            ? "not_found"
            : response.status === 422
              ? "validation"
              : response.status >= 500
                ? "server"
                : "server";

    throw new ApiError({
      message: parseFastApiErrorMessage(data, response.status),
      kind,
      status: response.status,
      details: data,
    });
  }

  if (response.status === 204) return undefined as T;

  if (!validate(data)) {
    throw new ApiError({
      message: "Respuesta inválida del servidor.",
      kind: "invalid_response",
      status: response.status,
      details: data,
    });
  }

  return data;
}

function isVoid(_value: unknown): _value is undefined {
  return true;
}

function isToken(value: unknown): value is {
  access_token: string;
  token_type: string;
  refresh_token?: string;
} {
  return (
    isRecord(value) &&
    typeof value.access_token === "string" &&
    typeof value.token_type === "string"
  );
}

export type Category = { id: number; name: string };
function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string"
  );
}
function isCategoryArray(value: unknown): value is Category[] {
  return Array.isArray(value) && value.every(isCategory);
}

export type Questionnaire = {
  id: number;
  questionnaire_number: number;
  category_id: number;
  category_name?: string | null;
  estimated_duration_minutes?: number | null;
  difficulty?: string | number | null;
  teacher_id?: number | null;
  is_active?: boolean | null;
};
function isQuestionnaire(value: unknown): value is Questionnaire {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.questionnaire_number === "number" &&
    typeof value.category_id === "number" &&
    (value.category_name === undefined ||
      value.category_name === null ||
      typeof value.category_name === "string") &&
    (value.estimated_duration_minutes === undefined ||
      value.estimated_duration_minutes === null ||
      typeof value.estimated_duration_minutes === "number") &&
    (value.difficulty === undefined ||
      value.difficulty === null ||
      typeof value.difficulty === "string" ||
      typeof value.difficulty === "number") &&
    (value.teacher_id === undefined ||
      value.teacher_id === null ||
      typeof value.teacher_id === "number") &&
    (value.is_active === undefined ||
      value.is_active === null ||
      typeof value.is_active === "boolean")
  );
}
function isQuestionnaireArray(value: unknown): value is Questionnaire[] {
  return Array.isArray(value) && value.every(isQuestionnaire);
}

export type Question = {
  id: number;
  question_text: string;
  questionnaire_id: number;
};
function isQuestion(value: unknown): value is Question {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.question_text === "string" &&
    typeof value.questionnaire_id === "number"
  );
}
function isQuestionArray(value: unknown): value is Question[] {
  return Array.isArray(value) && value.every(isQuestion);
}

export type AnswerOption = {
  id: number;
  answer: string;
  option_key: string;
  question_id: number;
  is_correct?: boolean | null;
};
function isAnswerOption(value: unknown): value is AnswerOption {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.answer === "string" &&
    typeof value.option_key === "string" &&
    typeof value.question_id === "number" &&
    (value.is_correct === undefined ||
      value.is_correct === null ||
      typeof value.is_correct === "boolean")
  );
}
function isAnswerOptionArray(value: unknown): value is AnswerOption[] {
  return Array.isArray(value) && value.every(isAnswerOption);
}

export type School = { id: number; name: string };
function isSchool(value: unknown): value is School {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string"
  );
}
function isSchoolArray(value: unknown): value is School[] {
  return Array.isArray(value) && value.every(isSchool);
}

export type Role = { id: number; name: string };
function isRole(value: unknown): value is Role {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string"
  );
}
function isRoleArray(value: unknown): value is Role[] {
  return Array.isArray(value) && value.every(isRole);
}

export type User = {
  id: number;
  name: string;
  last_name: string;
  email: string;
  residential_address?: string | null;
  type_document_identity: string;
  document_identity: string;
  school_id: number;
};
function isUser(value: unknown): value is User {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.last_name === "string" &&
    typeof value.email === "string" &&
    typeof value.type_document_identity === "string" &&
    typeof value.document_identity === "string" &&
    typeof value.school_id === "number" &&
    (value.residential_address === undefined ||
      value.residential_address === null ||
      typeof value.residential_address === "string")
  );
}
function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every(isUser);
}

export type Teacher = {
  name: string;
  last_name: string;
};
function isTeacher(value: unknown): value is Teacher {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.last_name === "string"
  );
}
function isTeacherArray(value: unknown): value is Teacher[] {
  return Array.isArray(value) && value.every(isTeacher);
}

export type UserResponse = {
  id: number;
  user_id: number;
  questionnaire_id: number;
  score: number;
  answers: string;
  duration_seconds?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};
function isUserResponse(value: unknown): value is UserResponse {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.user_id === "number" &&
    typeof value.questionnaire_id === "number" &&
    typeof value.score === "number" &&
    typeof value.answers === "string" &&
    (value.duration_seconds === undefined ||
      value.duration_seconds === null ||
      typeof value.duration_seconds === "number") &&
    (value.created_at === undefined ||
      value.created_at === null ||
      typeof value.created_at === "string") &&
    (value.updated_at === undefined ||
      value.updated_at === null ||
      typeof value.updated_at === "string")
  );
}
function isUserResponseArray(value: unknown): value is UserResponse[] {
  return Array.isArray(value) && value.every(isUserResponse);
}

export type UserResponseAnswers = Record<string, unknown> | unknown[] | string;

export type UserDashboard = {
  weekly_study_minutes?: number | null;
  weekly_goal_minutes?: number | null;
  average_score?: number | null;
  total_responses?: number | null;
  total_questionnaires_completed?: number | null;
  last_questionnaire_id?: number | null;
  last_questionnaire_name?: string | null;
  last_module?: string | null;
  last_category_id?: number | null;
};
function isUserDashboard(value: unknown): value is UserDashboard {
  if (!isRecord(value)) return false;
  const v = value as Record<string, unknown>;
  const okNumberOrNullOrUndef = (x: unknown) =>
    x === undefined || x === null || typeof x === "number";
  const okStringOrNullOrUndef = (x: unknown) =>
    x === undefined || x === null || typeof x === "string";
  return (
    okNumberOrNullOrUndef(v.weekly_study_minutes) &&
    okNumberOrNullOrUndef(v.weekly_goal_minutes) &&
    okNumberOrNullOrUndef(v.average_score) &&
    okNumberOrNullOrUndef(v.total_responses) &&
    okNumberOrNullOrUndef(v.total_questionnaires_completed) &&
    okNumberOrNullOrUndef(v.last_questionnaire_id) &&
    okStringOrNullOrUndef(v.last_questionnaire_name) &&
    okStringOrNullOrUndef(v.last_module) &&
    okNumberOrNullOrUndef(v.last_category_id)
  );
}

export type CategoryProgress = {
  category_id: number;
  category_name: string;
  status: string;
  average_score: number;
  total_questionnaires: number;
  completed_questionnaires: number;
};
function isCategoryProgress(value: unknown): value is CategoryProgress {
  return (
    isRecord(value) &&
    typeof value.category_id === "number" &&
    typeof value.category_name === "string" &&
    typeof value.status === "string" &&
    typeof value.average_score === "number" &&
    typeof value.total_questionnaires === "number" &&
    typeof value.completed_questionnaires === "number"
  );
}
function isCategoryProgressArray(value: unknown): value is CategoryProgress[] {
  return Array.isArray(value) && value.every(isCategoryProgress);
}

export const api = {
  auth: {
    login: async (payload: { email: string; password: string }) => {
      const response = await rawRequest({
        method: "POST",
        path: "/auth/login",
        body: payload,
        auth: false,
      });

      if (response.ok) {
        const data = await safeReadJson(response);
        if (!isToken(data)) {
          throw new ApiError({
            message: "Respuesta inválida del servidor (token faltante).",
            kind: "invalid_response",
            status: response.status,
            details: data,
          });
        }
        return data;
      }

      if (response.status === 400 || response.status === 422) {
        const formBody = `username=${encodeURIComponent(payload.email)}&password=${encodeURIComponent(payload.password)}`;
        const formResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formBody,
        });

        const data = await safeReadJson(formResponse);
        if (formResponse.ok) {
          if (!isToken(data)) {
            throw new ApiError({
              message: "Respuesta inválida del servidor (token faltante).",
              kind: "invalid_response",
              status: formResponse.status,
              details: data,
            });
          }
          return data;
        }

        throw new ApiError({
          message: parseFastApiErrorMessage(data, formResponse.status),
          kind: formResponse.status === 422 ? "validation" : "server",
          status: formResponse.status,
          details: data,
        });
      }

      const data = await safeReadJson(response);
      throw new ApiError({
        message: parseFastApiErrorMessage(data, response.status),
        kind:
          response.status === 401
            ? "unauthorized"
            : response.status >= 500
              ? "server"
              : "server",
        status: response.status,
        details: data,
      });
    },
    register: async (payload: {
      name: string;
      last_name: string;
      email: string;
      residential_address?: string | null;
      type_document_identity: string;
      document_identity: string;
      school_id: number;
      password: string;
    }) =>
      requestJson<User>(
        { method: "POST", path: "/auth/register", body: payload, auth: false },
        isUser,
      ),
    logout: async () =>
      requestJson<undefined>({ method: "POST", path: "/auth/logout" }, isVoid),
    refresh: async () => {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) {
        throw new ApiError({
          message: "No hay refresh token disponible.",
          kind: "unauthorized",
          status: 401,
        });
      }
      const response = await rawRequest({
        method: "POST",
        path: "/auth/refresh",
        body: { refresh_token: refreshToken },
        auth: false,
      });

      const data = await safeReadJson(response);
      if (!response.ok) {
        throw new ApiError({
          message: parseFastApiErrorMessage(data, response.status),
          kind: response.status === 401 ? "unauthorized" : "server",
          status: response.status,
          details: data,
        });
      }
      if (!isToken(data)) {
        throw new ApiError({
          message: "Respuesta inválida del servidor.",
          kind: "invalid_response",
          status: response.status,
          details: data,
        });
      }
      return data;
    },
  },
  categories: {
    list: (opts?: { skip?: number; limit?: number }) =>
      requestJson<Category[]>(
        {
          method: "GET",
          path: "/categories/",
          query: { skip: opts?.skip ?? 0, limit: opts?.limit ?? 100 },
        },
        isCategoryArray,
      ),
    get: (categoryId: number) =>
      requestJson<Category>(
        { method: "GET", path: `/categories/${categoryId}` },
        isCategory,
      ),
    create: (payload: { name: string }) =>
      requestJson<Category>(
        { method: "POST", path: "/categories/", body: payload },
        isCategory,
      ),
    update: (categoryId: number, payload: { name?: string | null }) =>
      requestJson<Category>(
        { method: "PATCH", path: `/categories/${categoryId}`, body: payload },
        isCategory,
      ),
    delete: (categoryId: number) =>
      requestJson<undefined>(
        { method: "DELETE", path: `/categories/${categoryId}` },
        isVoid,
      ),
  },
  questionnaires: {
    list: (opts?: { skip?: number; limit?: number; category_id?: number }) =>
      requestJson<Questionnaire[]>(
        {
          method: "GET",
          path: "/questionnaires/",
          query: {
            skip: opts?.skip ?? 0,
            limit: opts?.limit ?? 100,
            category_id: opts?.category_id,
          },
        },
        isQuestionnaireArray,
      ),
    get: (id: number) =>
      requestJson<Questionnaire>(
        { method: "GET", path: `/questionnaires/${id}` },
        isQuestionnaire,
      ),
    create: (payload: {
      questionnaire_number: number;
      category_id: number;
      estimated_duration_minutes: number;
      difficulty: "easy" | "medium" | "hard";
      teacher_id?: number;
      is_active: boolean;
    }) =>
      requestJson<Questionnaire>(
        { method: "POST", path: "/questionnaires/", body: payload },
        isQuestionnaire,
      ),
    update: (
      id: number,
      payload: {
        questionnaire_number?: number | null;
        category_id?: number | null;
        estimated_duration_minutes?: number | null;
        difficulty?: "easy" | "medium" | "hard" | string | number | null;
        teacher_id?: number | null;
        is_active?: boolean | null;
      },
    ) =>
      requestJson<Questionnaire>(
        { method: "PATCH", path: `/questionnaires/${id}`, body: payload },
        isQuestionnaire,
      ),
    delete: (id: number) =>
      requestJson<undefined>(
        { method: "DELETE", path: `/questionnaires/${id}` },
        isVoid,
      ),
  },
  questions: {
    list: (opts?: {
      skip?: number;
      limit?: number;
      questionnaire_id?: number;
    }) =>
      requestJson<Question[]>(
        {
          method: "GET",
          path: "/questions/",
          query: {
            skip: opts?.skip ?? 0,
            limit: opts?.limit ?? 100,
            questionnaire_id: opts?.questionnaire_id,
          },
        },
        isQuestionArray,
      ),
    get: (id: number) =>
      requestJson<Question>(
        { method: "GET", path: `/questions/${id}` },
        isQuestion,
      ),
    create: (payload: { question_text: string; questionnaire_id: number }) =>
      requestJson<Question>(
        { method: "POST", path: "/questions/", body: payload },
        isQuestion,
      ),
    update: (
      id: number,
      payload: {
        question_text?: string | null;
        questionnaire_id?: number | null;
      },
    ) =>
      requestJson<Question>(
        { method: "PATCH", path: `/questions/${id}`, body: payload },
        isQuestion,
      ),
    delete: (id: number) =>
      requestJson<undefined>(
        { method: "DELETE", path: `/questions/${id}` },
        isVoid,
      ),
  },
  answerOptions: {
    list: (opts?: { skip?: number; limit?: number; question_id?: number }) =>
      requestJson<AnswerOption[]>(
        {
          method: "GET",
          path: "/answer-options/",
          query: {
            skip: opts?.skip ?? 0,
            limit: opts?.limit ?? 100,
            question_id: opts?.question_id,
          },
        },
        isAnswerOptionArray,
      ),
    get: (id: number) =>
      requestJson<AnswerOption>(
        { method: "GET", path: `/answer-options/${id}` },
        isAnswerOption,
      ),
    create: (payload: {
      answer: string;
      option_key: string;
      question_id: number;
      is_correct?: boolean | null;
    }) =>
      requestJson<AnswerOption>(
        { method: "POST", path: "/answer-options/", body: payload },
        isAnswerOption,
      ),
    update: (
      id: number,
      payload: {
        answer?: string | null;
        option_key?: string | null;
        question_id?: number | null;
        is_correct?: boolean | null;
      },
    ) =>
      requestJson<AnswerOption>(
        { method: "PATCH", path: `/answer-options/${id}`, body: payload },
        isAnswerOption,
      ),
    delete: (id: number) =>
      requestJson<undefined>(
        { method: "DELETE", path: `/answer-options/${id}` },
        isVoid,
      ),
  },
  schools: {
    list: (opts?: { skip?: number; limit?: number; auth?: boolean }) =>
      requestJson<School[]>(
        {
          method: "GET",
          path: "/schools/",
          query: { skip: opts?.skip ?? 0, limit: opts?.limit ?? 100 },
          auth: opts?.auth ?? true,
        },
        isSchoolArray,
      ),
    get: (id: number) =>
      requestJson<School>({ method: "GET", path: `/schools/${id}` }, isSchool),
    create: (payload: { name: string }) =>
      requestJson<School>(
        { method: "POST", path: "/schools/", body: payload },
        isSchool,
      ),
    update: (id: number, payload: { name?: string | null }) =>
      requestJson<School>(
        { method: "PATCH", path: `/schools/${id}`, body: payload },
        isSchool,
      ),
    delete: (id: number) =>
      requestJson<undefined>(
        { method: "DELETE", path: `/schools/${id}` },
        isVoid,
      ),
  },
  roles: {
    list: (opts?: { skip?: number; limit?: number }) =>
      requestJson<Role[]>(
        {
          method: "GET",
          path: "/roles/",
          query: { skip: opts?.skip ?? 0, limit: opts?.limit ?? 100 },
        },
        isRoleArray,
      ),
    get: (id: number) =>
      requestJson<Role>({ method: "GET", path: `/roles/${id}` }, isRole),
    create: (payload: { name: string }) =>
      requestJson<Role>(
        { method: "POST", path: "/roles/", body: payload },
        isRole,
      ),
    update: (id: number, payload: { name?: string | null }) =>
      requestJson<Role>(
        { method: "PATCH", path: `/roles/${id}`, body: payload },
        isRole,
      ),
    delete: (id: number) =>
      requestJson<undefined>(
        { method: "DELETE", path: `/roles/${id}` },
        isVoid,
      ),
  },
  users: {
    list: (opts?: { skip?: number; limit?: number }) =>
      requestJson<User[]>(
        {
          method: "GET",
          path: "/users/",
          query: { skip: opts?.skip ?? 0, limit: opts?.limit ?? 100 },
        },
        isUserArray,
      ),
    get: (id: number) =>
      requestJson<User>({ method: "GET", path: `/users/${id}` }, isUser),
    update: (
      id: number,
      payload: Partial<Omit<User, "id">> & { password?: string | null },
    ) =>
      requestJson<User>(
        { method: "PATCH", path: `/users/${id}`, body: payload as any },
        isUser,
      ),
    delete: (id: number) =>
      requestJson<undefined>(
        { method: "DELETE", path: `/users/${id}` },
        isVoid,
      ),
    dashboard: (userId: number) =>
      requestJson<UserDashboard>(
        { method: "GET", path: `/users/${userId}/dashboard` },
        isUserDashboard,
      ),
    categoriesProgress: (userId: number) =>
      requestJson<CategoryProgress[]>(
        { method: "GET", path: `/users/${userId}/categories-progress` },
        isCategoryProgressArray,
      ),
    teachers: (opts: { teacher_user_id: number }) =>
      requestJson<Teacher[]>(
        {
          method: "GET",
          path: "/users/teachers",
          query: { teacher_user_id: opts.teacher_user_id },
        },
        isTeacherArray,
      ),
  },
  userResponses: {
    list: (opts?: { skip?: number; limit?: number }) =>
      requestJson<UserResponse[]>(
        {
          method: "GET",
          path: "/user-responses/",
          query: { skip: opts?.skip ?? 0, limit: opts?.limit ?? 100 },
        },
        isUserResponseArray,
      ),
    get: (id: number) =>
      requestJson<UserResponse>(
        { method: "GET", path: `/user-responses/${id}` },
        isUserResponse,
      ),
    create: (payload: {
      user_id: number;
      questionnaire_id: number;
      answers: UserResponseAnswers;
      duration_seconds?: number | null;
    }) =>
      requestJson<UserResponse>(
        { method: "POST", path: "/user-responses/", body: payload as any },
        isUserResponse,
      ),
    update: (
      id: number,
      payload: {
        user_id?: number | null;
        questionnaire_id?: number | null;
        answers?: UserResponseAnswers | null;
        duration_seconds?: number | null;
      },
    ) =>
      requestJson<UserResponse>(
        {
          method: "PATCH",
          path: `/user-responses/${id}`,
          body: payload as any,
        },
        isUserResponse,
      ),
    delete: (id: number) =>
      requestJson<undefined>(
        { method: "DELETE", path: `/user-responses/${id}` },
        isVoid,
      ),
  },
};
