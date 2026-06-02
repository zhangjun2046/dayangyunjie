import { Injectable } from '@nestjs/common';

@Injectable()
export class EnvConfigService {
  private getValue(key: string, fallback?: string): string {
    const value = process.env[key] ?? fallback;
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  get jwtAccessSecret(): string {
    return this.getValue('JWT_ACCESS_SECRET', 'dev_access_secret_change_me');
  }

  get jwtRefreshSecret(): string {
    return this.getValue('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me');
  }

  get jwtAccessExpiresIn(): string {
    return this.getValue('JWT_ACCESS_EXPIRES_IN', '2h');
  }

  get jwtRefreshExpiresIn(): string {
    return this.getValue('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  get mockOpenidPrefix(): string {
    return this.getValue('WECHAT_MOCK_OPENID_PREFIX', 'mock_openid_');
  }
}
