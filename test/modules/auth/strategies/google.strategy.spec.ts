import { Test, TestingModule } from '@nestjs/testing';
import { GoogleStrategy } from '../../../../src/modules/auth/strategies/google.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { SocialiteType } from '../../../../src/modules/auth/enums/auth.socialite-type.enum';
import { User } from '../../../../src/modules/auth/entities/user.entity';
import { UserStatus } from '../../../../src/modules/auth/enums/auth.user-status.enum';

const makeUser = (): User =>
  ({
    id: 'user-uuid-google',
    email: 'google@example.com',
    phone: null,
    password: null,
    status: UserStatus.ACTIVE,
    first_name: 'John',
    last_name: 'Doe',
    phone_verify_id: '00000000-0000-0000-0000-000000000000',
    email_verify_id: '0',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    socialites: [],
    sessions: [],
    addresses: [],
  } as User);

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: { validateOAuthLogin: jest.Mock };

  beforeEach(async () => {
    authService = { validateOAuthLogin: jest.fn() };

    const configServiceMock = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'mock-client-id',
          GOOGLE_CLIENT_SECRET: 'mock-client-secret',
          GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
        };
        return map[key] ?? null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  // ── constructor fallback branches ─────────────────────────────────────────
  describe('constructor', () => {
    it('falls back to default values when config keys are undefined', async () => {
      const emptyConfig = { get: jest.fn().mockReturnValue(undefined) };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          { provide: ConfigService, useValue: emptyConfig },
          { provide: AuthService, useValue: authService },
        ],
      }).compile();
      const s = module.get<GoogleStrategy>(GoogleStrategy);
      expect(s).toBeDefined();
    });
  });

  describe('validate', () => {
    const profile = {
      id: 'google-123',
      emails: [{ value: 'google@example.com' }],
      displayNmae: 'John Doe',
      photos: [{ value: 'https://avatar.url' }],
      _raw: JSON.stringify({ sub: 'google-123' }),
    };

    it('calls done with user on success', async () => {
      const user = makeUser();
      authService.validateOAuthLogin.mockResolvedValue(user);
      const done = jest.fn();

      await strategy.validate('access-token', 'refresh-token', profile, done);

      expect(authService.validateOAuthLogin).toHaveBeenCalledWith(profile, SocialiteType.GOOGLE);
      expect(done).toHaveBeenCalledWith(null, user);
    });

    it('calls done with error when validateOAuthLogin throws', async () => {
      const error = new Error('OAuth failed');
      authService.validateOAuthLogin.mockRejectedValue(error);
      const done = jest.fn();

      await strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(error, false);
    });
  });
});
