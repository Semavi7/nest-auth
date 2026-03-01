import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { Request, Response } from 'express';

// ─── mock factory ─────────────────────────────────────────────────────────────

const buildAuthServiceMock = () => ({
  register: jest.fn(),
  validateUser: jest.fn(),
  login: jest.fn(),
  forgetPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyAccount: jest.fn(),
  resendVerificationOtp: jest.fn(),
});

const buildRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  ip: '127.0.0.1',
  headers: { 'user-agent': 'jest-agent' },
  ...overrides,
});

const buildResponse = (): Partial<Response> => ({
  cookie: jest.fn(),
  redirect: jest.fn(),
});

// ──────────────────────────────────────────────────────────────────────────────

describe('AuthController', () => {
  let controller: AuthController;
  let authService: ReturnType<typeof buildAuthServiceMock>;

  beforeEach(async () => {
    authService = buildAuthServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  // ── general ──────────────────────────────────────────────────────────────
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── register ─────────────────────────────────────────────────────────────
  describe('register', () => {
    it('delegates to AuthService.register and returns its result', async () => {
      const dto = { email: 'new@test.com', password: 'pass123' };
      const expected = { message: 'Kayıt başarılı.', user: {} };
      authService.register.mockResolvedValue(expected);

      const req = buildRequest() as Request;
      const result = await controller.register(dto, req);

      expect(authService.register).toHaveBeenCalledWith(dto, req.ip, req.headers['user-agent']);
      expect(result).toBe(expected);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('validates user, calls login, sets cookie, and returns user data', async () => {
      const user = { id: 'u1', email: 'test@example.com' };
      const loginResult = { accessToken: 'token123', user };
      authService.validateUser.mockResolvedValue(user);
      authService.login.mockResolvedValue(loginResult);

      const req = buildRequest() as Request;
      const res = buildResponse() as Response;
      const dto = { email: 'test@example.com', password: 'pass123' } as any;

      const result = await controller.login(req, dto, res);

      expect(authService.validateUser).toHaveBeenCalledWith(dto);
      expect(authService.login).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        'Authentication',
        loginResult.accessToken,
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ message: 'Giriş başarılı', user });
    });
  });

  // ── forgetPassword ────────────────────────────────────────────────────────
  describe('forgetPassword', () => {
    it('delegates to AuthService.forgetPassword and returns result', async () => {
      const dto = { email: 'test@example.com', channel: 'email' } as any;
      const expected = { message: 'Şifre sıfırlama kodu gönderildi.' };
      authService.forgetPassword.mockResolvedValue(expected);

      const req = buildRequest() as Request;
      const result = await controller.forgetPassword(req, dto);

      expect(authService.forgetPassword).toHaveBeenCalledWith(dto, req.ip, req.headers['user-agent']);
      expect(result).toBe(expected);
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('delegates to AuthService.resetPassword and returns result', async () => {
      const dto = { verify_id: 'v1', code: '123456', new_password: 'newpass' } as any;
      const expected = { message: 'Şifreniz başarıyla sıfırlandı.' };
      authService.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  // ── verifyAccount ─────────────────────────────────────────────────────────
  describe('verifyAccount', () => {
    it('delegates to AuthService.verifyAccount and returns result', async () => {
      const dto = { email: 'test@example.com', code: '123456' } as any;
      const expected = { message: 'Hesabınız başarıyla doğrulandı.' };
      authService.verifyAccount.mockResolvedValue(expected);

      const result = await controller.verifyAccount(dto);

      expect(authService.verifyAccount).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  // ── resendVerificationOtp ─────────────────────────────────────────────────
  describe('resendVerificationOtp', () => {
    it('delegates to AuthService.resendVerificationOtp and returns result', async () => {
      const dto = { email: 'test@example.com' } as any;
      const expected = { message: 'Yeni doğrulama kodu gönderildi.' };
      authService.resendVerificationOtp.mockResolvedValue(expected);

      const req = buildRequest() as Request;
      const result = await controller.resendVerificationOtp(dto, req);

      expect(authService.resendVerificationOtp).toHaveBeenCalledWith(dto, req.ip, req.headers['user-agent']);
      expect(result).toBe(expected);
    });
  });
});
