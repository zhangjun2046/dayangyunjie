/** 本地 token 存取（P2.1 对接 JWT 后替换实现） */
const TOKEN_KEY = 'dayangyunjie_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
