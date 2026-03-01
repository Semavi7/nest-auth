import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../../src/modules/auth/entities/user.entity';
import { UserSession } from '../../../src/modules/auth/entities/user-sessions.entity';
import { Verify } from '../../../src/modules/auth/entities/verify.entity';
import { ForgetPassword } from '../../../src/modules/auth/entities/forget_password.entity';
import { Socialite } from '../../../src/modules/auth/entities/socialites.entity';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '../../../src/modules/auth/enums/auth.user-status.enum';
import { VerifyStatus } from '../../../src/modules/auth/enums/auth.verify-status.enum';
import { VerifyChannel } from '../../../src/modules/auth/enums/auth.verify-channel.enum';
import { VerifyType } from '../../../src/modules/auth/enums/auth.verify-type.enum';
import { SocialiteType } from '../../../src/modules/auth/enums/auth.socialite-type.enum';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('crypto', () => ({ randomInt: jest.fn(), randomUUID: jest.fn().mockReturnValue('mock-uuid') }));

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-uuid-1',
    email: 'test@example.com',
    phone: null,
    password: 'hashed-password',
    first_name: 'Test',
    last_name: 'User',
    status: UserStatus.ACTIVE,
    phone_verify_id: '00000000-0000-0000-0000-000000000000',
    email_verify_id: '0',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    socialites: [],
    sessions: [],
    addresses: [],
    ...overrides,
  } as User);

const makeVerify = (overrides: Partial<Verify> = {}): Verify =>
  ({
    id: 'verify-uuid-1',
    user_id: 'user-uuid-1',
    code: '123456',
    status: VerifyStatus.PENDING,
    channel: VerifyChannel.EMAIL,
    type: VerifyType.VERIFY_ACCOUNT,
    attempts_count: 0,
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
    ip_address: '127.0.0.1',
    user_agent: 'jest',
    ...overrides,
  } as Verify);

const makeForgetRecord = (overrides: Partial<ForgetPassword> = {}): ForgetPassword =>
  ({
    id: 'fp-uuid-1',
    user_id: 'user-uuid-1',
    verify_id: 'verify-uuid-1',
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
    is_used_at: null,
    ...overrides,
  } as ForgetPassword);

// ─── factory helpers for repository mocks ─────────────────────────────────────

const makeRepoMock = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  update: jest.fn(),
});

// ──────────────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof makeRepoMock>;
  let sessionRepo: ReturnType<typeof makeRepoMock>;
  let verifyRepo: ReturnType<typeof makeRepoMock>;
  let forgetPasswordRepo: ReturnType<typeof makeRepoMock>;
  let socialiteRepo: ReturnType<typeof makeRepoMock>;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    userRepo = makeRepoMock();
    sessionRepo = makeRepoMock();
    verifyRepo = makeRepoMock();
    forgetPasswordRepo = makeRepoMock();
    socialiteRepo = makeRepoMock();
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserSession), useValue: sessionRepo },
        { provide: getRepositoryToken(Verify), useValue: verifyRepo },
        { provide: getRepositoryToken(ForgetPassword), useValue: forgetPasswordRepo },
        { provide: getRepositoryToken(Socialite), useValue: socialiteRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── general ────────────────────────────────────────────────────────────────
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── validateUser ───────────────────────────────────────────────────────────
  describe('validateUser', () => {
    it('returns user when credentials are correct', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser({ email: user.email, password: 'pass123' } as any);
      expect(result).toBe(user);
    });

    it('throws UnauthorizedException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.validateUser({ email: 'nope@test.com', password: 'pass' } as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user has no password (OAuth user)', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ password: null }));
      await expect(service.validateUser({ email: 'test@example.com', password: 'pass' } as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is pending', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ status: UserStatus.PENDING }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.validateUser({ email: 'test@example.com', password: 'pass' } as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser({ email: 'test@example.com', password: 'wrong' } as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('builds where conditions using phone when email is absent', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.validateUser({ phone: '+905001234567', password: 'pass' } as any))
        .rejects.toThrow(UnauthorizedException);
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: [{ phone: '+905001234567' }] });
    });
  });

  // ── register ───────────────────────────────────────────────────────────────
  describe('register', () => {
    it('creates user and verify record when email is new', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const savedUser = makeUser({ status: UserStatus.PENDING });
      userRepo.save.mockResolvedValue(savedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      verifyRepo.save.mockResolvedValue({});
      (crypto.randomInt as jest.Mock).mockReturnValue(654321);

      const result = await service.register({ email: 'new@test.com', password: 'pass123' } as any, '1.1.1.1', 'agent');

      expect(userRepo.save).toHaveBeenCalled();
      expect(verifyRepo.save).toHaveBeenCalled();
      expect(result.message).toContain('Kayıt başarılı');
    });

    it('creates verify record with SMS channel when phone is used', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(makeUser({ email: null, phone: '+905001234567' }));
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (crypto.randomInt as jest.Mock).mockReturnValue(111111);
      let savedVerify: any;
      verifyRepo.create.mockImplementation((dto) => dto);
      verifyRepo.save.mockImplementation((v) => { savedVerify = v; return Promise.resolve(v); });

      await service.register({ phone: '+905001234567', password: 'pass123' } as any);

      expect(savedVerify.channel).toBe(VerifyChannel.SMS);
    });

    it('throws UnauthorizedException when email/phone already registered', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      await expect(service.register({ email: 'test@example.com', password: 'pass' } as any))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('signs a JWT and saves a session', async () => {
      const user = makeUser();
      jwtService.sign.mockReturnValue('access-token');
      sessionRepo.create.mockReturnValue({} as any);
      sessionRepo.save.mockResolvedValue({} as any);

      const result = await service.login(user, '1.1.1.1', 'agent');
      expect(result).toEqual({ access_token: 'access-token', user });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email, phone: user.phone });
      expect(sessionRepo.save).toHaveBeenCalled();
    });
  });

  // ── validateOAuthLogin ─────────────────────────────────────────────────────
  describe('validateOAuthLogin', () => {
    const profile = {
      id: 'google-123',
      emails: [{ value: 'google@example.com' }],
      displayNmae: 'John Doe',
      photos: [{ value: 'https://avatar.url' }],
      _raw: JSON.stringify({ sub: 'google-123' }),
    };

    it('returns existing user when socialite record exists', async () => {
      const user = makeUser({ email: 'google@example.com' });
      socialiteRepo.findOne.mockResolvedValue({ user });
      const result = await service.validateOAuthLogin(profile, SocialiteType.GOOGLE);
      expect(result).toBe(user);
    });

    it('links existing user (by email) to new socialite record', async () => {
      const user = makeUser({ email: 'google@example.com' });
      socialiteRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(user);
      socialiteRepo.save.mockResolvedValue({});

      const result = await service.validateOAuthLogin(profile, SocialiteType.GOOGLE);

      expect(socialiteRepo.save).toHaveBeenCalled();
      expect(result).toBe(user);
    });

    it('creates new user when no match exists', async () => {
      const newUser = makeUser({ email: 'google@example.com', status: UserStatus.ACTIVE });
      socialiteRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(newUser);
      socialiteRepo.save.mockResolvedValue({});

      const result = await service.validateOAuthLogin(profile, SocialiteType.GOOGLE);

      expect(userRepo.save).toHaveBeenCalled();
      expect(result).toBe(newUser);
    });
  });

  // ── forgetPassword ─────────────────────────────────────────────────────────
  describe('forgetPassword', () => {
    it('creates verify and forgetPassword records and returns verify_id', async () => {
      const user = makeUser();
      const verify = makeVerify({ type: VerifyType.FORGET_PASSWORD });
      userRepo.findOne.mockResolvedValue(user);
      (crypto.randomInt as jest.Mock).mockReturnValue(999999);
      verifyRepo.save.mockResolvedValue(verify);
      forgetPasswordRepo.save.mockResolvedValue({});

      const result = await service.forgetPassword(
        { email: 'test@example.com', channel: VerifyChannel.EMAIL } as any,
        '1.1.1.1',
        'agent',
      );

      expect(result.verify_id).toBe(verify.id);
      expect(result.message).toContain('gönderildi');
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.forgetPassword({ email: 'nope@test.com', channel: VerifyChannel.EMAIL } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    const dto = { verify_id: 'verify-uuid-1', code: '123456', new_password: 'newpass123' };

    it('resets password and marks records as used', async () => {
      const verify = makeVerify();
      const forgetRecord = makeForgetRecord();
      const user = makeUser();
      verifyRepo.findOne.mockResolvedValue(verify);
      forgetPasswordRepo.findOne.mockResolvedValue(forgetRecord);
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');
      userRepo.save.mockResolvedValue(user);
      verifyRepo.save.mockResolvedValue(verify);
      forgetPasswordRepo.save.mockResolvedValue(forgetRecord);

      const result = await service.resetPassword(dto);

      expect(result.message).toContain('başarıyla sıfırlandı');
      expect(user.password).toBe('new-hashed');
      expect(verify.status).toBe(VerifyStatus.COMPLETED);
      expect(forgetRecord.is_used_at).toBeInstanceOf(Date);
    });

    it('throws BadRequestException when verify record is not found', async () => {
      verifyRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when verify token is expired', async () => {
      verifyRepo.findOne.mockResolvedValue(
        makeVerify({ expires_at: new Date(Date.now() - 1000) }),
      );
      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when max attempts exceeded', async () => {
      verifyRepo.findOne.mockResolvedValue(makeVerify({ attempts_count: 5 }));
      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('increments attempts_count and throws BadRequestException on wrong code', async () => {
      const verify = makeVerify({ code: '654321' });
      verifyRepo.findOne.mockResolvedValue(verify);
      verifyRepo.save.mockResolvedValue(verify);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(verify.attempts_count).toBe(1);
    });

    it('throws BadRequestException when forget record not found', async () => {
      verifyRepo.findOne.mockResolvedValue(makeVerify());
      forgetPasswordRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user not found for forget record', async () => {
      verifyRepo.findOne.mockResolvedValue(makeVerify());
      forgetPasswordRepo.findOne.mockResolvedValue(makeForgetRecord());
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── verifyAccount ──────────────────────────────────────────────────────────
  describe('verifyAccount', () => {
    const dto = { email: 'test@example.com', code: '123456' };

    it('activates account and returns success message', async () => {
      const user = makeUser({ status: UserStatus.PENDING });
      const verify = makeVerify();
      userRepo.findOne.mockResolvedValue(user);
      verifyRepo.findOne.mockResolvedValue(verify);
      verifyRepo.save.mockResolvedValue(verify);
      userRepo.save.mockResolvedValue(user);

      const result = await service.verifyAccount(dto);

      expect(result.message).toContain('başarıyla doğrulandı');
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.email_verify_id).toBe(verify.id);
    });

    it('sets phone_verify_id when channel is SMS', async () => {
      const user = makeUser({ status: UserStatus.PENDING });
      const verify = makeVerify({ channel: VerifyChannel.SMS });
      userRepo.findOne.mockResolvedValue(user);
      verifyRepo.findOne.mockResolvedValue(verify);
      verifyRepo.save.mockResolvedValue(verify);
      userRepo.save.mockResolvedValue(user);

      await service.verifyAccount({ phone: '+905001234567', code: '123456' });

      expect(user.phone_verify_id).toBe(verify.id);
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyAccount(dto)).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException when account is already active', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ status: UserStatus.ACTIVE }));
      await expect(service.verifyAccount(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when no pending verify record found', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ status: UserStatus.PENDING }));
      verifyRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyAccount(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when verify code is expired', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ status: UserStatus.PENDING }));
      verifyRepo.findOne.mockResolvedValue(makeVerify({ expires_at: new Date(Date.now() - 1000) }));
      await expect(service.verifyAccount(dto)).rejects.toThrow(BadRequestException);
    });

    it('marks verify as COMPLETED and throws when attempts >= 5', async () => {
      const user = makeUser({ status: UserStatus.PENDING });
      const verify = makeVerify({ attempts_count: 5 });
      userRepo.findOne.mockResolvedValue(user);
      verifyRepo.findOne.mockResolvedValue(verify);
      verifyRepo.save.mockResolvedValue(verify);

      await expect(service.verifyAccount(dto)).rejects.toThrow(BadRequestException);
      expect(verify.status).toBe(VerifyStatus.COMPLETED);
    });

    it('increments attempts and throws BadRequestException on wrong code', async () => {
      const user = makeUser({ status: UserStatus.PENDING });
      const verify = makeVerify({ code: '654321' });
      userRepo.findOne.mockResolvedValue(user);
      verifyRepo.findOne.mockResolvedValue(verify);
      verifyRepo.save.mockResolvedValue(verify);

      await expect(service.verifyAccount({ email: 'test@example.com', code: '000000' })).rejects.toThrow(
        BadRequestException,
      );
      expect(verify.attempts_count).toBe(1);
    });
  });

  // ── resendVerificationOtp ──────────────────────────────────────────────────
  describe('resendVerificationOtp', () => {
    it('invalidates old codes and creates a new verify record', async () => {
      const user = makeUser({ status: UserStatus.PENDING });
      userRepo.findOne.mockResolvedValue(user);
      verifyRepo.update.mockResolvedValue({});
      verifyRepo.save.mockResolvedValue({});
      (crypto.randomInt as jest.Mock).mockReturnValue(777777);

      const result = await service.resendVerificationOtp({ email: 'test@example.com' }, '1.1.1.1', 'agent');

      expect(verifyRepo.update).toHaveBeenCalled();
      expect(verifyRepo.save).toHaveBeenCalled();
      expect(result.message).toContain('Yeni doğrulama kodu gönderildi');
    });

    it('uses SMS channel when phone is provided', async () => {
      const user = makeUser({ status: UserStatus.PENDING, email: null, phone: '+905001234567' });
      userRepo.findOne.mockResolvedValue(user);
      verifyRepo.update.mockResolvedValue({});
      let created: any;
      verifyRepo.create.mockImplementation((dto) => dto);
      verifyRepo.save.mockImplementation((v) => { created = v; return Promise.resolve(v); });
      (crypto.randomInt as jest.Mock).mockReturnValue(888888);

      await service.resendVerificationOtp({ phone: '+905001234567' });

      expect(created.channel).toBe(VerifyChannel.SMS);
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.resendVerificationOtp({ email: 'nope@test.com' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when account is already active', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ status: UserStatus.ACTIVE }));
      await expect(service.resendVerificationOtp({ email: 'test@example.com' })).rejects.toThrow(BadRequestException);
    });
  });
});
