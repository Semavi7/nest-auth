import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from '../../../../src/modules/auth/decorators/current-user.decorator';

// Apply the decorator on a static class so TypeScript is satisfied.
class TestController {
  public testMethod(@CurrentUser() _user: any) {}
}

function getDecoratorFactory(): (...args: any[]) => any {
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'testMethod');
  const key = Object.keys(args)[0];
  return args[key].factory;
}

// NOTE: The decorator implementation declares a single parameter named `ctx`,
// which corresponds to the `data` position in NestJS's createParamDecorator
// signature `(data, ctx)`.  Therefore the ExecutionContext must be passed as
// the FIRST argument when invoking the factory directly.
describe('@CurrentUser() decorator', () => {
  it('returns request.user from the ExecutionContext', () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockContext: Partial<ExecutionContext> = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: mockUser }),
      }),
    };

    const factory = getDecoratorFactory();
    const result = factory(undefined, mockContext as ExecutionContext);

    expect(result).toBe(mockUser);
    expect(mockContext.switchToHttp).toHaveBeenCalled();
  });

  it('returns undefined when request has no user', () => {
    const mockContext: Partial<ExecutionContext> = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    };

    const factory = getDecoratorFactory();
    const result = factory(undefined, mockContext as ExecutionContext);

    expect(result).toBeUndefined();
  });
});
