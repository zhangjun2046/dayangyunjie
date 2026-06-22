export interface JwtPayload {
  sub: number;
  openid?: string;
  phone?: string;
  email?: string;
  role: string;
  tokenType: 'access' | 'refresh';
}
