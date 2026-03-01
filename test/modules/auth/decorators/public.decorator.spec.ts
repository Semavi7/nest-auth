import { IS_PUBLIC_KEY, Public } from '../../../../src/modules/auth/decorators/public.decorator';
import { SetMetadata } from '@nestjs/common';

jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return { ...actual, SetMetadata: jest.fn(actual.SetMetadata) };
});

describe('@Public() decorator', () => {
  it('calls SetMetadata with IS_PUBLIC_KEY and true', () => {
    Public();
    expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
  });

  it('IS_PUBLIC_KEY constant has value "isPublic"', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('sets metadata correctly on a handler', () => {
    class TestController {
      @Public()
      testHandler() {}
    }

    const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.testHandler);
    expect(metadata).toBe(true);
  });
});
