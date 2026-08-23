/** 保留服务端业务码和 HTTP 状态，供页面处理可恢复的业务冲突。 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}
