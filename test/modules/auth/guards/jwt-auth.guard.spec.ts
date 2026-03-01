import { JwtAuthGuard } from '../../../../src/modules/auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../../../src/modules/auth/decorators/public.decorator';

const makeContext = (): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(),
  } as unknown as ExecutionContext);

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('returns true immediately for public routes without calling passport', () => {
      const ctx = makeContext();
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
    });

    it('delegates to passport JWT strategy for protected routes', () => {
      const ctx = makeContext();
      reflector.getAllAndOverride.mockReturnValue(false);

      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(ctx);

      superCanActivate.mockRestore();
    });

    it('delegates to parent when isPublic metadata is undefined', () => {
      const ctx = makeContext();
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(ctx);

      expect(superCanActivate).toHaveBeenCalled();
      superCanActivate.mockRestore();
    });
  });
});
