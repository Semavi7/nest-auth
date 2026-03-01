import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../../../../src/modules/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';

// ─── shared factory ───────────────────────────────────────────────────────────
async function buildStrategy(jwtSecret: string | undefined): Promise<JwtStrategy> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      JwtStrategy,
      { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(jwtSecret) } },
    ],
  }).compile();
  return module.get<JwtStrategy>(JwtStrategy);
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    strategy = await buildStrategy('test-jwt-secret');
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  // ── constructor branches ───────────────────────────────────────────────────
  describe('constructor', () => {
    it('initialises successfully when JWT_SECRET is provided', async () => {
      const s = await buildStrategy('my-secret');
      expect(s).toBeDefined();
    });

    it('falls back to hardcoded secretKey when JWT_SECRET is undefined', async () => {
      const s = await buildStrategy(undefined);
      expect(s).toBeDefined();
    });
  });

  // ── validate ───────────────────────────────────────────────────────────────
  describe('validate', () => {
    it('returns userId and email from payload', async () => {
      const payload = { sub: 'user-uuid-1', email: 'test@example.com' };
      const result = await strategy.validate(payload);
      expect(result).toEqual({ userId: 'user-uuid-1', email: 'test@example.com' });
    });

    it('returns userId with null email when email is absent in payload', async () => {
      const payload = { sub: 'user-uuid-2', email: null };
      const result = await strategy.validate(payload);
      expect(result).toEqual({ userId: 'user-uuid-2', email: null });
    });
  });
});
