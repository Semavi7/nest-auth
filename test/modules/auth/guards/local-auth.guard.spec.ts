import { LocalAuthGuard } from '../../../../src/modules/auth/guards/local-auth.guard';
import { ExecutionContext } from '@nestjs/common';

const makeContext = (): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({}),
      getResponse: jest.fn().mockReturnValue({}),
    }),
  } as unknown as ExecutionContext);

describe('LocalAuthGuard', () => {
  let guard: LocalAuthGuard;

  beforeEach(() => {
    guard = new LocalAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('is an instance of the passport local AuthGuard mixin', () => {
    const AuthGuardLocal = require('@nestjs/passport').AuthGuard('local');
    expect(guard).toBeInstanceOf(AuthGuardLocal);
  });

  it('delegates canActivate to passport local strategy', () => {
    const ctx = makeContext();
    const superCanActivate = jest
      .spyOn(Object.getPrototypeOf(LocalAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(ctx);

    superCanActivate.mockRestore();
  });
});
