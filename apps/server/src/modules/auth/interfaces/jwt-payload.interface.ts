export interface JwtPayload {
  sub: number;
  openid?: string;
  phone?: string;
  role: string;
  tokenType: 'access' | 'refresh';
}
