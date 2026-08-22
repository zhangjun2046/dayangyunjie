import { describe, expect, it } from 'vitest';
import { ApiRequestError } from './errors';

describe('ApiRequestError', () => {
  it('完整保留 message、业务 code 和 HTTP status', () => {
    const error = new ApiRequestError('投诉原因已停用', 400, 409);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiRequestError');
    expect(error.message).toBe('投诉原因已停用');
    expect(error.code).toBe(400);
    expect(error.statusCode).toBe(409);
  });

  it('不会混淆业务 code 与 HTTP status 的边界值', () => {
    const error = new ApiRequestError('', 0, 400);

    expect(error.message).toBe('');
    expect(error.code).toBe(0);
    expect(error.statusCode).toBe(400);
  });
});
