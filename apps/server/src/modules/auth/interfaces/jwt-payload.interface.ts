export interface JwtPayload {
  sub: number;
  openid: string;
  role: string;
  tokenType: 'access' | 'refresh';
}
