/**
 * P2.13 Auth 模块单元测试 — Worker 手机号+密码登录 + 密码管理
 *
 * 测试矩阵：
 *  1. workerLogin    — 正确凭据返回 tokens；密码错误 → 401；手机号不存在 → 401
 *  2. changePassword — 旧密码正确 → 更新成功；旧密码错误 → 400；Worker 不存在 → 404
 *  3. resetPassword  — 重置密码为手机号后可登录；Worker 不存在 → 404
 */

import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { WorkerService } from '../worker/worker.service';

// ─── Mock 工厂 ────────────────────────────────────────────────────────────────

const PHONE = '13800138001';
const PASSWORD = 'password123';
let passwordHash: string;

/** 构造最小 Worker 行（passwordHash 在 beforeAll 中填充） */
function makeWorkerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    employeeNo: 'W001',
    passwordHash,
    name: '张师傅',
    phone: PHONE,
    nickname: null,
    gender: null,
    idCard: null,
    position: null,
    skillType: 'CLEANING',
    emergencyContact: null,
    emergencyPhone: null,
    avatar: null,
    status: 'IDLE',
    rating: 5.0,
    totalOrders: 0,
    healthCertUrl: null,
    healthCertExpiry: null,
    skillCertUrl: null,
    skillCertExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** 构造 PrismaService mock */
function makePrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    worker: {
      findUnique: jest.fn(),
      update: jest.fn(),
      ...((overrides as any).worker ?? {}),
    },
    resident: {
      findUnique: jest.fn(),
    },
    ...overrides,
  };
}

/** 构造 JwtService mock，signAsync 返回固定字符串 */
function makeJwtMock() {
  return {
    signAsync: jest.fn().mockResolvedValue('mock_token'),
    verifyAsync: jest.fn(),
  };
}

/** 构造 EnvConfigService mock */
function makeEnvConfigMock() {
  return {
    jwtAccessSecret: 'test-access-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    jwtAccessExpiresIn: '2h',
    jwtRefreshExpiresIn: '7d',
    mockOpenidPrefix: 'mock_',
    hasWechatCustomerCredentials: false,
  };
}

/** 构造 WechatCustomerService mock（默认未配置，走 mock openid/手机号） */
function makeWechatCustomerMock() {
  return {
    isConfigured: false,
    code2Session: jest.fn(),
    getPhoneNumber: jest.fn(),
  };
}

// ─── AuthService — workerLogin ────────────────────────────────────────────────

describe('AuthService.workerLogin', () => {
  let authService: AuthService;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let jwtMock: ReturnType<typeof makeJwtMock>;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 10);
  });

  beforeEach(() => {
    prismaMock = makePrismaMock();
    jwtMock = makeJwtMock();
    authService = new AuthService(
      prismaMock as any,
      jwtMock as any,
      makeEnvConfigMock() as any,
      makeWechatCustomerMock() as any,
    );
  });

  it('正确手机号和密码 → 返回 tokens 与 worker 信息', async () => {
    prismaMock.worker.findUnique.mockResolvedValue(makeWorkerRow());

    const result = await authService.workerLogin({ phone: PHONE, password: PASSWORD });

    expect(result).toMatchObject({
      tokens: {
        accessToken: 'mock_token',
        refreshToken: 'mock_token',
        expiresIn: 7200,
      },
      worker: {
        id: 1,
        phone: PHONE,
        name: '张师傅',
        employeeNo: 'W001',
      },
    });
    expect(jwtMock.signAsync).toHaveBeenCalledTimes(2);
  });

  it('手机号不存在 → 抛出 UnauthorizedException', async () => {
    prismaMock.worker.findUnique.mockResolvedValue(null);

    await expect(
      authService.workerLogin({ phone: '99999999999', password: PASSWORD }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('密码错误 → 抛出 UnauthorizedException', async () => {
    prismaMock.worker.findUnique.mockResolvedValue(makeWorkerRow());

    await expect(
      authService.workerLogin({ phone: PHONE, password: 'wrongpassword' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('返回的 JWT payload 包含 role=worker', async () => {
    prismaMock.worker.findUnique.mockResolvedValue(makeWorkerRow());
    await authService.workerLogin({ phone: PHONE, password: PASSWORD });

    const firstCall = jwtMock.signAsync.mock.calls[0];
    expect(firstCall[0]).toMatchObject({ role: 'worker', phone: PHONE, tokenType: 'access' });
  });
});

// ─── WorkerService — changePassword ──────────────────────────────────────────

describe('WorkerService.changePassword', () => {
  let workerService: WorkerService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 10);
  });

  beforeEach(() => {
    prismaMock = makePrismaMock();
    workerService = new WorkerService(prismaMock as any);
  });

  it('旧密码正确 → 更新密码并返回员工（不含 passwordHash）', async () => {
    const updatedHash = await bcrypt.hash('newPass999', 10);
    prismaMock.worker.findUnique.mockResolvedValue(makeWorkerRow());
    prismaMock.worker.update.mockResolvedValue(makeWorkerRow({ passwordHash: updatedHash }));

    const result = await workerService.changePassword(1, PASSWORD, 'newPass999');

    expect(result).not.toHaveProperty('passwordHash');
    expect(prismaMock.worker.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it('旧密码错误 → 抛出 BadRequestException', async () => {
    prismaMock.worker.findUnique.mockResolvedValue(makeWorkerRow());

    await expect(
      workerService.changePassword(1, 'wrongOldPass', 'newPass999'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Worker 不存在 → 抛出 NotFoundException', async () => {
    prismaMock.worker.findUnique.mockResolvedValue(null);

    await expect(
      workerService.changePassword(999, PASSWORD, 'newPass999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── WorkerService — resetPassword ───────────────────────────────────────────

describe('WorkerService.resetPassword', () => {
  let workerService: WorkerService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 10);
  });

  beforeEach(() => {
    prismaMock = makePrismaMock();
    workerService = new WorkerService(prismaMock as any);
  });

  it('重置成功 → 返回员工（不含 passwordHash）', async () => {
    prismaMock.worker.findUnique.mockResolvedValue(makeWorkerRow());
    prismaMock.worker.update.mockImplementation(async (args: any) => {
      // 验证新密码是手机号的 bcrypt 哈希
      const isPhoneHash = await bcrypt.compare(PHONE, args.data.passwordHash);
      expect(isPhoneHash).toBe(true);
      return makeWorkerRow({ passwordHash: args.data.passwordHash });
    });

    const result = await workerService.resetPassword(1);

    expect(result).not.toHaveProperty('passwordHash');
    expect(prismaMock.worker.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it('Worker 不存在 → 抛出 NotFoundException', async () => {
    prismaMock.worker.findUnique.mockResolvedValue(null);

    await expect(workerService.resetPassword(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('重置后用手机号可登录（AuthService.workerLogin 联动验证）', async () => {
    // 模拟 resetPassword 将密码设置为 phone 的 bcrypt hash
    const phoneHash = await bcrypt.hash(PHONE, 10);
    prismaMock.worker.findUnique.mockResolvedValue(makeWorkerRow({ passwordHash: phoneHash }));

    const jwtMock = makeJwtMock();
    const authService = new AuthService(
      prismaMock as any,
      jwtMock as any,
      makeEnvConfigMock() as any,
      makeWechatCustomerMock() as any,
    );

    // 用手机号作为密码登录
    const result = await authService.workerLogin({ phone: PHONE, password: PHONE });
    expect(result.tokens.accessToken).toBe('mock_token');
  });
});
