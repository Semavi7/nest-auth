import { Test, TestingModule } from '@nestjs/testing';
import { LocalStrategy } from '../../../../src/modules/auth/strategies/local.strategy';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '../../../../src/modules/auth/enums/auth.user-status.enum';
import { User } from '../../../../src/modules/auth/entities/user.entity';

const makeUser = (): User =>
  ({
    id: 'user-uuid-1',
    email: 'test@example.com',
    phone: null,
    password: 'hashed',
    status: UserStatus.ACTIVE,
    first_name: 'Test',
    last_name: 'User',
    phone_verify_id: '00000000-0000-0000-0000-000000000000',
    email_verify_id: '0',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    socialites: [],
    sessions: [],
    addresses: [],
  } as User);

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: { validateUser: jest.Mock };

  beforeEach(async () => {
    authService = { validateUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('returns user when credentials are valid', async () => {
      const user = makeUser();
      authService.validateUser.mockResolvedValue(user);

      const result = await strategy.validate({ email: 'test@example.com', password: 'pass123' } as any);
      expect(result).toBe(user);
    });

    it('throws UnauthorizedException when validateUser returns falsy', async () => {
      authService.validateUser.mockResolvedValue(null);
      await expect(strategy.validate({ email: 'bad@test.com', password: 'wrong' } as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('propagates exception thrown by AuthService.validateUser', async () => {
      authService.validateUser.mockRejectedValue(new UnauthorizedException('Email veya şifre hatalı'));
      await expect(strategy.validate({ email: 'test@example.com', password: 'bad' } as any))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
