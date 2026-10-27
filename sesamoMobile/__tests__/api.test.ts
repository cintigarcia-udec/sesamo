import {
  ApiError,
  clearStoredAccessToken,
  getJwtPayload,
  getJwtRoleId,
  getJwtUserId,
  getStoredAccessToken,
  setStoredAccessToken,
} from '@/constants/api';

describe('API & JWT Utilities', () => {
  // Helper to create a dummy JWT with a given payload
  function makeToken(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${body}.mockSignature`;
  }

  describe('getJwtPayload', () => {
    it('decodes a valid JWT payload correctly', () => {
      const token = makeToken({ sub: 'user@sesamo.com', id: 10, role_id: 1 });
      const payload = getJwtPayload(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user@sesamo.com');
      expect(payload?.id).toBe(10);
      expect(payload?.role_id).toBe(1);
    });

    it('returns null for tokens without dots or malformed format', () => {
      expect(getJwtPayload('')).toBeNull();
      expect(getJwtPayload('invalid_token_without_dots')).toBeNull();
    });

    it('returns null when payload is corrupted JSON', () => {
      expect(getJwtPayload('header.not_valid_base64_json.sig')).toBeNull();
    });

    it('handles url-safe base64 characters (- and _)', () => {
      // payload containing special characters that create - or _ in base64url
      const token = makeToken({ text: '>>??&&--__' });
      const payload = getJwtPayload(token);
      expect(payload?.text).toBe('>>??&&--__');
    });
  });

  describe('getJwtRoleId', () => {
    it('extracts direct numeric role_id', () => {
      const token = makeToken({ role_id: 1 });
      expect(getJwtRoleId(token)).toBe(1);
    });

    it('extracts direct roleId camelCase', () => {
      const token = makeToken({ roleId: 2 });
      expect(getJwtRoleId(token)).toBe(2);
    });

    it('maps role string "Admin" / "Administrador" to 1', () => {
      expect(getJwtRoleId(makeToken({ role: 'Admin' }))).toBe(1);
      expect(getJwtRoleId(makeToken({ role: 'admin' }))).toBe(1);
      expect(getJwtRoleId(makeToken({ role: 'Administrador' }))).toBe(1);
    });

    it('maps role string "Estudiante" to 2', () => {
      expect(getJwtRoleId(makeToken({ role: 'Estudiante' }))).toBe(2);
      expect(getJwtRoleId(makeToken({ role: 'estudiante' }))).toBe(2);
    });

    it('maps role string "Docente" to 3', () => {
      expect(getJwtRoleId(makeToken({ role: 'Docente' }))).toBe(3);
    });

    it('extracts nested role object { role: { id: 1 } }', () => {
      const token = makeToken({ role: { id: 1 } });
      expect(getJwtRoleId(token)).toBe(1);
    });

    it('extracts role from array roles: [1]', () => {
      const token = makeToken({ roles: [1] });
      expect(getJwtRoleId(token)).toBe(1);
    });

    it('returns null when role is absent', () => {
      const token = makeToken({ sub: 'nobody' });
      expect(getJwtRoleId(token)).toBeNull();
    });
  });

  describe('getJwtUserId', () => {
    it('extracts direct user_id numeric', () => {
      const token = makeToken({ user_id: 42 });
      expect(getJwtUserId(token)).toBe(42);
    });

    it('extracts id property', () => {
      const token = makeToken({ id: 99 });
      expect(getJwtUserId(token)).toBe(99);
    });

    it('converts string numeric id "123" to number 123', () => {
      const token = makeToken({ id: '123' });
      expect(getJwtUserId(token)).toBe(123);
    });

    it('extracts nested user.id', () => {
      const token = makeToken({ user: { id: 7 } });
      expect(getJwtUserId(token)).toBe(7);
    });

    it('falls back to numeric sub', () => {
      const token = makeToken({ sub: '55' });
      expect(getJwtUserId(token)).toBe(55);
    });

    it('returns null when user id cannot be resolved to a finite number', () => {
      const token = makeToken({ sub: 'not_a_number@email.com' });
      expect(getJwtUserId(token)).toBeNull();
    });
  });

  describe('ApiError', () => {
    it('creates an instance with status, message and kind', () => {
      const error = new ApiError({
        message: 'Error de autenticación',
        status: 401,
        kind: 'unauthorized',
      });
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Error de autenticación');
      expect(error.status).toBe(401);
      expect(error.kind).toBe('unauthorized');
    });
  });

  describe('Token in-memory storage', () => {
    beforeEach(async () => {
      await clearStoredAccessToken();
    });

    it('stores, retrieves and clears in-memory access token', async () => {
      const mockToken = makeToken({ id: 1, role_id: 1 });
      await setStoredAccessToken(mockToken);

      const retrieved = await getStoredAccessToken();
      expect(retrieved).toBe(mockToken);

      await clearStoredAccessToken();
      const cleared = await getStoredAccessToken();
      expect(cleared == null).toBe(true);
    });
  });
});
