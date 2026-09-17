import { NotifyService } from './notify.service';

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    hasWechatOaCredentials: true,
    hasWechatAdminH5BaseUrl: true,
    wechatMpReleased: true,
    wechatWorkerAppId: 'wx_worker',
    wechatCustomerAppId: 'wx_customer',
    get serverBaseUrl() {
      const value = process.env.SERVER_BASE_URL?.trim();
      if (!value || value === '待补充') {
        return undefined;
      }
      return value;
    },
    ...overrides,
  };
}

function makePrisma(follower: Record<string, unknown> | null) {
  return {
    wechatOaFollower: {
      findUnique: jest.fn().mockResolvedValue(follower),
    },
  };
}

describe('NotifyService', () => {
  const originalServerBase = process.env.SERVER_BASE_URL;

  afterEach(() => {
    process.env.SERVER_BASE_URL = originalServerBase;
  });

  it('无粉丝 / 未关注跳过微信且不抛错', async () => {
    const wechatOa = { sendTemplate: jest.fn() };
    const sms = { send: jest.fn() };
    const svc = new NotifyService(
      makeEnv() as never,
      makePrisma(null) as never,
      wechatOa as never,
      sms as never,
    );

    await expect(
      svc.deliver({
        wechat: {
          target: { workerId: 1 },
          templateId: 'tmpl',
          data: { thing18: '保洁服务-日常保洁' },
        },
        sms: { phone: '13800138000', templateCode: 'SMS_512035746' },
      }),
    ).resolves.toBeUndefined();

    expect(wechatOa.sendTemplate).not.toHaveBeenCalled();
    expect(sms.send).toHaveBeenCalled();
  });

  it('微信与短信并行都发（Promise.allSettled）', async () => {
    const wechatOa = { sendTemplate: jest.fn().mockResolvedValue(true) };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const svc = new NotifyService(
      makeEnv() as never,
      makePrisma({ oaOpenid: 'oa_worker', subscribed: true }) as never,
      wechatOa as never,
      sms as never,
    );

    await svc.deliver({
      wechat: {
        target: { workerId: 2 },
        templateId: 'tmpl-assigned',
        data: { character_string6: 'CLN20260907000001' },
        jump: { kind: 'miniprogram', appid: 'wx_worker', pagepath: 'pages/task-detail/index?orderId=1&orderType=cleaning' },
      },
      sms: {
        phone: '13900000000',
        templateCode: 'SMS_512035746',
        templateParam: { appointTime: '2026年09月07日14:00' },
      },
    });

    expect(wechatOa.sendTemplate).toHaveBeenCalledTimes(1);
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(wechatOa.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        oaOpenid: 'oa_worker',
        miniprogram: expect.objectContaining({ appid: 'wx_worker' }),
      }),
    );
    expect(wechatOa.sendTemplate.mock.calls[0][0].url).toBeUndefined();
  });

  it('运营 H5 未配则跳过运营微信，短信仍可发', async () => {
    const wechatOa = { sendTemplate: jest.fn() };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const svc = new NotifyService(
      makeEnv({ hasWechatAdminH5BaseUrl: false }) as never,
      makePrisma({ oaOpenid: 'oa_admin', subscribed: true }) as never,
      wechatOa as never,
      sms as never,
    );

    await svc.deliver({
      wechat: {
        target: { adminId: 9 },
        templateId: 'tmpl-admin',
        data: { thing5: '保洁服务-日常保洁' },
        jump: { kind: 'url', url: 'https://example/redirect' },
      },
      sms: { phone: '13700000000', templateCode: 'SMS_512410706', templateParam: { serviceName: '保洁服务' } },
    });

    expect(wechatOa.sendTemplate).not.toHaveBeenCalled();
    expect(sms.send).toHaveBeenCalled();
  });

  it('微信失败不影响短信', async () => {
    const wechatOa = { sendTemplate: jest.fn().mockRejectedValue(new Error('oa down')) };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const svc = new NotifyService(
      makeEnv() as never,
      makePrisma({ oaOpenid: 'oa_res', subscribed: true }) as never,
      wechatOa as never,
      sms as never,
    );

    await expect(
      svc.deliver({
        wechat: { target: { residentId: 3 }, templateId: 't', data: { thing1: 'x' } },
        sms: { phone: '13600000000', templateCode: 'SMS_512135723' },
      }),
    ).resolves.toBeUndefined();
    expect(sms.send).toHaveBeenCalled();
  });

  it('adminRedirectJump 在 H5 与 API 基址齐时只给 url', () => {
    process.env.SERVER_BASE_URL = 'https://api.yunjiezhixiang.cn';
    const svc = new NotifyService(
      makeEnv() as never,
      makePrisma(null) as never,
      { sendTemplate: jest.fn() } as never,
      { send: jest.fn() } as never,
    );
    expect(svc.adminRedirectJump('cleaning', 8)).toEqual({
      kind: 'url',
      url: 'https://api.yunjiezhixiang.cn/api/v1/wechat/oa/redirect?type=cleaning&id=8',
    });
  });

  it('WECHAT_MP_RELEASED!=true 时居民/员工不附带 miniprogram 跳转', () => {
    const svc = new NotifyService(
      makeEnv({ wechatMpReleased: false }) as never,
      makePrisma(null) as never,
      { sendTemplate: jest.fn() } as never,
      { send: jest.fn() } as never,
    );
    expect(svc.residentMiniprogram('pages/order-detail/index?id=1&type=cleaning')).toBeUndefined();
    expect(svc.workerMiniprogram('pages/task-detail/index?orderId=1&orderType=cleaning')).toBeUndefined();
  });

  it('notifyWorkerAssigned 只打新员工通道，time13 用派单格式', async () => {
    const wechatOa = { sendTemplate: jest.fn().mockResolvedValue(true) };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const svc = new NotifyService(
      makeEnv({
        wechatOaTmplWorkerAssigned: 'OAuz-tmpl',
        smsTmplWorkerAssigned: 'SMS_512035746',
      }) as never,
      makePrisma({ oaOpenid: 'oa_new', subscribed: true }) as never,
      wechatOa as never,
      sms as never,
    );

    await svc.notifyWorkerAssigned({
      orderId: 11,
      orderType: 'CLEANING',
      orderNo: 'CLN20260907000001',
      workerId: 5,
      workerPhone: '13800138005',
      catalogName: '日常保洁',
      appointDate: new Date(Date.UTC(2026, 8, 7)),
      appointTimeSlot: '14:00',
      addressSnapshot: { province: '京', city: '京', district: '东', detail: '1号' },
    });

    expect(wechatOa.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        oaOpenid: 'oa_new',
        templateId: 'OAuz-tmpl',
        data: expect.objectContaining({
          character_string6: 'CLN20260907000001',
          thing18: '保洁服务-日常保洁',
          time13: '2026年09月07日 14:00:00',
        }),
        miniprogram: {
          appid: 'wx_worker',
          pagepath: 'pages/task-detail/index?orderId=11&orderType=cleaning',
        },
      }),
    );
    expect(wechatOa.sendTemplate.mock.calls[0][0].url).toBeUndefined();
    expect(sms.send).toHaveBeenCalledWith({
      phone: '13800138005',
      templateCode: 'SMS_512035746',
      templateParam: { appointTime: '2026年09月07日14:00' },
    });
  });

  it('接单：运营仅微信、居民微信+短信，同一模板且不通知员工', async () => {
    process.env.SERVER_BASE_URL = 'https://api.yunjiezhixiang.cn';
    const wechatOa = { sendTemplate: jest.fn().mockResolvedValue(true) };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const prisma = {
      wechatOaFollower: {
        findUnique: jest.fn(async ({ where }: { where: Record<string, number> }) => {
          if (where.adminId === 9) {
            return { oaOpenid: 'oa_admin', subscribed: true };
          }
          if (where.residentId === 1) {
            return { oaOpenid: 'oa_res', subscribed: true };
          }
          return null;
        }),
      },
      orderStatusLog: {
        findFirst: jest.fn().mockResolvedValue({ operatorId: 9 }),
      },
      resident: { findUnique: jest.fn() },
    };
    const svc = new NotifyService(
      makeEnv({
        wechatOaTmplAccepted: 'eX--accepted',
        smsTmplAcceptedResident: 'SMS_512135723',
      }) as never,
      prisma as never,
      wechatOa as never,
      sms as never,
    );

    await svc.notifyOrderAccepted({
      orderId: 11,
      orderType: 'CLEANING',
      orderNo: 'CLN20260907000001',
      residentId: 1,
      contactPhone: '13900000000',
      catalogName: '日常保洁',
      appointDate: new Date(Date.UTC(2026, 8, 7)),
      appointTimeSlot: '14:00',
      workerName: '新师傅',
      workerPhone: '13800138005',
    });

    expect(wechatOa.sendTemplate).toHaveBeenCalledTimes(2);
    const payloads = wechatOa.sendTemplate.mock.calls.map((call: unknown[]) => call[0]) as Array<{
      oaOpenid: string;
      url?: string;
      miniprogram?: unknown;
      data: Record<string, string>;
    }>;
    const adminMsg = payloads.find((p) => p.oaOpenid === 'oa_admin');
    const residentMsg = payloads.find((p) => p.oaOpenid === 'oa_res');
    expect(adminMsg?.url).toContain('/wechat/oa/redirect?type=cleaning&id=11');
    expect(adminMsg?.miniprogram).toBeUndefined();
    expect(residentMsg?.miniprogram).toEqual({
      appid: 'wx_customer',
      pagepath: 'pages/order-detail/index?id=11&type=cleaning',
    });
    expect(residentMsg?.url).toBeUndefined();
    expect(adminMsg?.data).toMatchObject({
      character_string1: 'CLN20260907000001',
      thing2: '保洁服务-日常保洁',
      time7: '2026-09-07 14:00',
      thing3: '新师傅',
      phone_number4: '13800138005',
    });
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(sms.send).toHaveBeenCalledWith({
      phone: '13900000000',
      templateCode: 'SMS_512135723',
      templateParam: { serviceName: '保洁服务', appointTime: '2026年09月07日14:00' },
    });
    expect(prisma.wechatOaFollower.findUnique).not.toHaveBeenCalledWith({
      where: { workerId: expect.anything() },
    });
  });

  it('完工：仅居民微信评价页，无短信', async () => {
    const wechatOa = { sendTemplate: jest.fn().mockResolvedValue(true) };
    const sms = { send: jest.fn() };
    const svc = new NotifyService(
      makeEnv({ wechatOaTmplCompletedResident: 'cRhL-done' }) as never,
      makePrisma({ oaOpenid: 'oa_res', subscribed: true }) as never,
      wechatOa as never,
      sms as never,
    );

    await svc.notifyOrderCompleted({
      orderId: 11,
      orderType: 'CLEANING',
      orderNo: 'CLN20260907000001',
      residentId: 1,
      catalogName: '日常保洁',
      completedAt: new Date('2026-09-07T06:05:00.000Z'),
    });

    expect(sms.send).not.toHaveBeenCalled();
    expect(wechatOa.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        oaOpenid: 'oa_res',
        templateId: 'cRhL-done',
        data: {
          character_string1: 'CLN20260907000001',
          thing2: '保洁服务-日常保洁',
          time7: '2026年9月7号 14:05',
        },
        miniprogram: {
          appid: 'wx_customer',
          pagepath: 'pages/review/index?orderId=11&orderType=CLEANING',
        },
      }),
    );
    expect(wechatOa.sendTemplate.mock.calls[0][0].url).toBeUndefined();
  });

  it('取消：仅居民微信详情页，无短信', async () => {
    const wechatOa = { sendTemplate: jest.fn().mockResolvedValue(true) };
    const sms = { send: jest.fn() };
    const svc = new NotifyService(
      makeEnv({ wechatOaTmplCancelledResident: 'dMNDu-cancel' }) as never,
      makePrisma({ oaOpenid: 'oa_res', subscribed: true }) as never,
      wechatOa as never,
      sms as never,
    );

    await svc.notifyOrderCancelled({
      orderId: 11,
      orderType: 'CLEANING',
      orderNo: 'CLN20260907000001',
      residentId: 1,
      catalogName: '日常保洁',
      cancelledAt: new Date('2026-09-07T06:05:09.000Z'),
    });

    expect(sms.send).not.toHaveBeenCalled();
    expect(wechatOa.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        oaOpenid: 'oa_res',
        templateId: 'dMNDu-cancel',
        data: {
          character_string1: 'CLN20260907000001',
          thing12: '保洁服务-日常保洁',
          time3: '2026-09-07 14:05:09',
        },
        miniprogram: {
          appid: 'wx_customer',
          pagepath: 'pages/order-detail/index?id=11&type=cleaning',
        },
      }),
    );
    expect(wechatOa.sendTemplate.mock.calls[0][0].url).toBeUndefined();
  });

  it('超时：15 分钟仍 ASSIGNED 则通知派单运营微信+短信，const2 固定文案', async () => {
    process.env.SERVER_BASE_URL = 'https://api.yunjiezhixiang.cn';
    const now = new Date('2026-09-07T06:20:00.000Z');
    const wechatOa = { sendTemplate: jest.fn().mockResolvedValue(true) };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const prisma = {
      cleaningOrder: {
        findMany: jest.fn().mockResolvedValue([{ id: 11, orderNo: 'CLN20260907000001' }]),
        findUnique: jest.fn().mockResolvedValue({ status: 'ASSIGNED' }),
      },
      recyclingOrder: { findMany: jest.fn().mockResolvedValue([]) },
      orderStatusLog: {
        findFirst: jest.fn().mockResolvedValue({
          id: 50,
          operatorId: 9,
          createdAt: new Date(now.getTime() - 16 * 60 * 1000),
        }),
      },
      admin: { findUnique: jest.fn().mockResolvedValue({ phone: '13700000009' }) },
      wechatOaFollower: {
        findUnique: jest.fn().mockResolvedValue({ oaOpenid: 'oa_admin', subscribed: true }),
      },
      notifySendLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const svc = new NotifyService(
      makeEnv({
        wechatOaTmplAcceptTimeoutAdmin: '1kdK-timeout',
        smsTmplAcceptTimeoutAdmin: 'SMS_512185692',
      }) as never,
      prisma as never,
      wechatOa as never,
      sms as never,
    );

    await svc.scanAcceptTimeouts(now);

    expect(wechatOa.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        oaOpenid: 'oa_admin',
        templateId: '1kdK-timeout',
        data: {
          character_string1: 'CLN20260907000001',
          const2: '服务人员接单超时',
        },
        url: expect.stringContaining('/wechat/oa/redirect?type=cleaning&id=11'),
      }),
    );
    expect(wechatOa.sendTemplate.mock.calls[0][0].miniprogram).toBeUndefined();
    expect(sms.send).toHaveBeenCalledWith({
      phone: '13700000009',
      templateCode: 'SMS_512185692',
      templateParam: { orderNo: 'CLN20260907000001' },
    });
    expect(prisma.notifySendLog.create).toHaveBeenCalledTimes(2);
  });

  it('超时：不足 15 分钟或已接单不发', async () => {
    const now = new Date('2026-09-07T06:20:00.000Z');
    const wechatOa = { sendTemplate: jest.fn() };
    const sms = { send: jest.fn() };
    const prisma = {
      cleaningOrder: {
        findMany: jest.fn().mockResolvedValue([{ id: 11, orderNo: 'CLN20260907000001' }]),
        findUnique: jest.fn().mockResolvedValue({ status: 'ASSIGNED' }),
      },
      recyclingOrder: { findMany: jest.fn().mockResolvedValue([]) },
      orderStatusLog: {
        findFirst: jest.fn().mockResolvedValue({
          id: 50,
          operatorId: 9,
          createdAt: new Date(now.getTime() - 10 * 60 * 1000),
        }),
      },
      notifySendLog: { create: jest.fn() },
    };
    const svc = new NotifyService(makeEnv() as never, prisma as never, wechatOa as never, sms as never);

    await svc.scanAcceptTimeouts(now);

    expect(wechatOa.sendTemplate).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
    expect(prisma.notifySendLog.create).not.toHaveBeenCalled();
  });

  it('T-30：仅短信通知居民与已派员工，不发微信', async () => {
    const now = new Date('2026-09-07T05:31:00.000Z');
    const wechatOa = { sendTemplate: jest.fn() };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const t30Row = {
      id: 11,
      orderNo: 'CLN20260907000001',
      residentId: 1,
      workerId: 5,
      contactPhone: '13900000000',
      appointDate: new Date(Date.UTC(2026, 8, 7)),
      appointTimeSlot: '14:00',
      worker: { phone: '13800138005' },
    };
    const prisma = {
      cleaningOrder: { findMany: jest.fn().mockResolvedValue([t30Row]) },
      recyclingOrder: { findMany: jest.fn().mockResolvedValue([]) },
      notifySendLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const svc = new NotifyService(
      makeEnv({
        smsTmplReminderResident: 'SMS_512230700',
        smsTmplReminderWorker: 'SMS_512160710',
      }) as never,
      prisma as never,
      wechatOa as never,
      sms as never,
    );

    await svc.scanT30Reminders(now);

    expect(wechatOa.sendTemplate).not.toHaveBeenCalled();
    expect(sms.send).toHaveBeenCalledTimes(2);
    expect(sms.send).toHaveBeenCalledWith({
      phone: '13900000000',
      templateCode: 'SMS_512230700',
      templateParam: { serviceName: '保洁服务' },
    });
    expect(sms.send).toHaveBeenCalledWith({
      phone: '13800138005',
      templateCode: 'SMS_512160710',
    });
  });

  it('T-30：未派单只发居民短信；幂等冲突不重发', async () => {
    const now = new Date('2026-09-07T05:31:00.000Z');
    const wechatOa = { sendTemplate: jest.fn() };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const prisma = {
      cleaningOrder: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 11,
            orderNo: 'CLN20260907000001',
            residentId: 1,
            workerId: null,
            contactPhone: '13900000000',
            appointDate: new Date(Date.UTC(2026, 8, 7)),
            appointTimeSlot: '14:00',
            worker: null,
          },
        ]),
      },
      recyclingOrder: { findMany: jest.fn().mockResolvedValue([]) },
      notifySendLog: {
        create: jest
          .fn()
          .mockRejectedValueOnce({ code: 'P2002' })
          .mockResolvedValue({}),
      },
    };
    const svc = new NotifyService(
      makeEnv({ smsTmplReminderResident: 'SMS_512230700' }) as never,
      prisma as never,
      wechatOa as never,
      sms as never,
    );

    await svc.scanT30Reminders(now);

    expect(sms.send).not.toHaveBeenCalled();
    expect(wechatOa.sendTemplate).not.toHaveBeenCalled();
  });

  it('下单：居民仅微信详情页；有权限运营微信+短信，无权限不发', async () => {
    process.env.SERVER_BASE_URL = 'https://api.yunjiezhixiang.cn';
    const wechatOa = { sendTemplate: jest.fn().mockResolvedValue(true) };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const prisma = {
      wechatOaFollower: {
        findUnique: jest.fn(async ({ where }: { where: Record<string, number> }) => {
          if (where.residentId === 1) {
            return { oaOpenid: 'oa_res', subscribed: true };
          }
          if (where.adminId === 9 || where.adminId === 8) {
            return { oaOpenid: `oa_admin_${where.adminId}`, subscribed: true };
          }
          return null;
        }),
      },
      admin: {
        findMany: jest.fn().mockResolvedValue([
          { id: 9, phone: '13700000009', isSuperAdmin: true, permissions: [] },
          { id: 8, phone: '13700000008', isSuperAdmin: false, permissions: [{ menuKey: 'orders.cleaning' }] },
          { id: 7, phone: '13700000007', isSuperAdmin: false, permissions: [{ menuKey: 'orders.recycling' }] },
        ]),
      },
    };
    const svc = new NotifyService(
      makeEnv({
        wechatOaTmplOrderCreatedResident: '76lG-created',
        wechatOaTmplNewOrderAdmin: 'c3VS-new',
        smsTmplNewOrderAdmin: 'SMS_512410706',
      }) as never,
      prisma as never,
      wechatOa as never,
      sms as never,
    );

    await svc.notifyOrderCreated({
      orderId: 11,
      orderType: 'CLEANING',
      orderNo: 'CLN20260907000001',
      residentId: 1,
      contactPhone: '13900000000',
      catalogName: '日常保洁',
      appointDate: new Date(Date.UTC(2026, 8, 7)),
      appointTimeSlot: '14:00',
      addressSnapshot: { province: '京', city: '京', district: '东', detail: '1号' },
    });

    expect(wechatOa.sendTemplate).toHaveBeenCalledTimes(3);
    const payloads = wechatOa.sendTemplate.mock.calls.map((call: unknown[]) => call[0]) as Array<{
      oaOpenid: string;
      templateId: string;
      url?: string;
      miniprogram?: unknown;
      data: Record<string, string>;
    }>;
    const residentMsg = payloads.find((p) => p.oaOpenid === 'oa_res');
    expect(residentMsg?.templateId).toBe('76lG-created');
    expect(residentMsg?.miniprogram).toEqual({
      appid: 'wx_customer',
      pagepath: 'pages/order-detail/index?id=11&type=cleaning',
    });
    expect(residentMsg?.url).toBeUndefined();
    expect(residentMsg?.data).toMatchObject({
      character_string14: 'CLN20260907000001',
      thing1: '保洁服务-日常保洁',
      time4: '2026-09-07 14:00',
    });
    const adminMsgs = payloads.filter((p) => p.oaOpenid.startsWith('oa_admin_'));
    expect(adminMsgs).toHaveLength(2);
    expect(adminMsgs.every((p) => p.templateId === 'c3VS-new')).toBe(true);
    expect(adminMsgs[0]?.data).toMatchObject({
      thing5: '保洁服务-日常保洁',
      phone_number9: '13900000000',
      time6: '2026-09-07 14:00',
    });
    expect(adminMsgs[0]?.url).toContain('/wechat/oa/redirect?type=cleaning&id=11');
    expect(adminMsgs[0]?.miniprogram).toBeUndefined();
    expect(sms.send).toHaveBeenCalledTimes(2);
    expect(sms.send).toHaveBeenCalledWith({
      phone: '13700000009',
      templateCode: 'SMS_512410706',
      templateParam: { serviceName: '保洁服务' },
    });
    expect(prisma.wechatOaFollower.findUnique).not.toHaveBeenCalledWith({
      where: { adminId: 7 },
    });
  });

  it('下单：无居民仍通知运营；H5 基址空则运营仅短信', async () => {
    const wechatOa = { sendTemplate: jest.fn().mockResolvedValue(true) };
    const sms = { send: jest.fn().mockResolvedValue(true) };
    const prisma = {
      wechatOaFollower: {
        findUnique: jest.fn().mockResolvedValue({ oaOpenid: 'oa_admin', subscribed: true }),
      },
      admin: {
        findMany: jest.fn().mockResolvedValue([
          { id: 9, phone: '13700000009', isSuperAdmin: true, permissions: [] },
        ]),
      },
    };
    const svc = new NotifyService(
      makeEnv({
        hasWechatAdminH5BaseUrl: false,
        wechatOaTmplNewOrderAdmin: 'c3VS-new',
        smsTmplNewOrderAdmin: 'SMS_512410706',
      }) as never,
      prisma as never,
      wechatOa as never,
      sms as never,
    );

    await svc.notifyOrderCreated({
      orderId: 11,
      orderType: 'CLEANING',
      orderNo: 'CLN20260907000001',
      residentId: null,
      contactPhone: '13900000000',
      catalogName: '日常保洁',
      appointDate: new Date(Date.UTC(2026, 8, 7)),
      appointTimeSlot: '14:00',
      addressSnapshot: { province: '京', city: '京', district: '东', detail: '1号' },
    });

    expect(wechatOa.sendTemplate).not.toHaveBeenCalled();
    expect(sms.send).toHaveBeenCalledTimes(1);
  });
});
