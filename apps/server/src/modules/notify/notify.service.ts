import { Injectable, Logger } from '@nestjs/common';
import { NotifyChannel, Prisma } from '@prisma/client';
import { EnvConfigService } from '../../common/config/env-config.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SmsService, type SmsSendInput } from '../sms/sms.service';
import { WechatOaService } from '../wechat-oa/wechat-oa.service';
import {
  ACCEPT_TIMEOUT_CONST2,
  ACCEPT_TIMEOUT_MS,
  appointDateKey,
  formatAddressThing,
  formatSmsAppointTime,
  formatSmsServiceName,
  formatWechatServiceName,
  formatWechatTime,
  isT30ReminderDue,
  residentOrderDetailPath,
  residentReviewPath,
  T30_ELIGIBLE_STATUSES,
  t30AppointDateBounds,
  truncateThing,
  workerTaskPath,
  type NotifyOrderType,
} from './notify-format';

type T30ScanRow = {
  id: number;
  orderNo: string;
  orderType: NotifyOrderType;
  residentId: number | null;
  workerId: number | null;
  contactPhone: string | null;
  appointDate: Date;
  appointTimeSlot: string;
  worker: { phone: string } | null;
};

export type NotifyWechatJump =
  | { kind: 'url'; url: string }
  | { kind: 'miniprogram'; appid: string; pagepath: string };

export type NotifyWechatTarget =
  | { adminId: number }
  | { workerId: number }
  | { residentId: number };

export type NotifyWechatInput = {
  target: NotifyWechatTarget;
  templateId?: string;
  data: Record<string, string>;
  jump?: NotifyWechatJump;
};

export type OrderAcceptedNotifyInput = {
  orderId: number;
  orderType: NotifyOrderType;
  orderNo: string;
  residentId?: number | null;
  contactPhone?: string | null;
  catalogName: string;
  appointDate: Date | string;
  appointTimeSlot: string;
  workerName: string;
  workerPhone: string;
};

export type OrderCompletedNotifyInput = {
  orderId: number;
  orderType: NotifyOrderType;
  orderNo: string;
  residentId?: number | null;
  catalogName: string;
  completedAt?: Date;
};

export type OrderCancelledNotifyInput = {
  orderId: number;
  orderType: NotifyOrderType;
  orderNo: string;
  residentId?: number | null;
  catalogName: string;
  cancelledAt?: Date;
};

export type WorkerAssignedNotifyInput = {
  orderId: number;
  orderType: NotifyOrderType;
  orderNo: string;
  workerId: number;
  workerPhone?: string | null;
  catalogName: string;
  appointDate: Date | string;
  appointTimeSlot: string;
  addressSnapshot: unknown;
};

export type OrderCreatedNotifyInput = {
  orderId: number;
  orderType: NotifyOrderType;
  orderNo: string;
  residentId?: number | null;
  contactPhone?: string | null;
  catalogName: string;
  appointDate: Date | string;
  appointTimeSlot: string;
  addressSnapshot: unknown;
};

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    private readonly envConfigService: EnvConfigService,
    private readonly prisma: PrismaService,
    private readonly wechatOaService: WechatOaService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * 微信与短信并行都发（不是失败补发）。任一通道失败只记日志。
   */
  async deliver(input: { wechat?: NotifyWechatInput | null; sms?: SmsSendInput | null }): Promise<void> {
    const tasks: Promise<unknown>[] = [];
    if (input.wechat) {
      tasks.push(this.sendWechat(input.wechat));
    }
    if (input.sms) {
      tasks.push(this.sendSms(input.sms));
    }
    if (tasks.length === 0) {
      return;
    }
    await Promise.allSettled(tasks);
  }

  /**
   * 下单成功：居民仅微信；有权限运营（ENABLED + 超管或对应 orders.*）微信+短信。
   * 运营微信在 H5 基址空时由 sendWechat 跳过；短信仍发。
   */
  async notifyOrderCreated(input: OrderCreatedNotifyInput): Promise<void> {
    try {
      const appointDate =
        typeof input.appointDate === 'string' ? new Date(input.appointDate) : input.appointDate;
      const orderTypePath = input.orderType === 'CLEANING' ? 'cleaning' : 'recycling';
      const serviceName = formatWechatServiceName(input.orderType, input.catalogName);
      const addressThing = formatAddressThing(input.addressSnapshot);
      const timeDashMinute = formatWechatTime('dashMinute', {
        appointDate,
        timeSlot: input.appointTimeSlot,
      });

      const tasks: Promise<unknown>[] = [];
      if (input.residentId) {
        tasks.push(
          this.deliver({
            wechat: {
              target: { residentId: input.residentId },
              templateId: this.envConfigService.wechatOaTmplOrderCreatedResident,
              data: {
                character_string14: input.orderNo,
                thing1: serviceName,
                time4: timeDashMinute,
                thing5: addressThing,
              },
              jump: this.residentMiniprogram(residentOrderDetailPath(input.orderId, orderTypePath)),
            },
          }),
        );
      } else {
        this.logger.log('wechat skip: no residentId for order-created notify reason=no_resident');
      }

      const admins = await this.findOrderNotifyAdmins(input.orderType);
      const adminJump = this.adminRedirectJump(orderTypePath, input.orderId);
      for (const admin of admins) {
        const phone = admin.phone?.trim() || null;
        tasks.push(
          this.deliver({
            wechat: {
              target: { adminId: admin.id },
              templateId: this.envConfigService.wechatOaTmplNewOrderAdmin,
              data: {
                thing5: serviceName,
                phone_number9: input.contactPhone ?? '',
                time6: timeDashMinute,
                thing4: addressThing,
              },
              jump: adminJump,
            },
            sms: phone
              ? {
                  phone,
                  templateCode: this.envConfigService.smsTmplNewOrderAdmin ?? '',
                  templateParam: { serviceName: formatSmsServiceName(input.orderType) },
                }
              : null,
          }),
        );
      }

      await Promise.allSettled(tasks);
    } catch (error) {
      this.logger.warn(
        `notifyOrderCreated failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** 派单/改派：仅通知新员工微信+短信。不通知原员工。失败不抛给业务。 */
  async notifyWorkerAssigned(input: WorkerAssignedNotifyInput): Promise<void> {
    try {
      const appointDate =
        typeof input.appointDate === 'string' ? new Date(input.appointDate) : input.appointDate;
      const orderTypePath = input.orderType === 'CLEANING' ? 'cleaning' : 'recycling';
      await this.deliver({
        wechat: {
          target: { workerId: input.workerId },
          templateId: this.envConfigService.wechatOaTmplWorkerAssigned,
          data: {
            character_string6: input.orderNo,
            thing18: formatWechatServiceName(input.orderType, input.catalogName),
            time13: formatWechatTime('cnSecond', {
              appointDate,
              timeSlot: input.appointTimeSlot,
            }),
            thing16: formatAddressThing(input.addressSnapshot),
          },
          jump: this.workerMiniprogram(workerTaskPath(input.orderId, orderTypePath)),
        },
        sms: input.workerPhone
          ? {
              phone: input.workerPhone,
              templateCode: this.envConfigService.smsTmplWorkerAssigned ?? '',
              templateParam: {
                appointTime: formatSmsAppointTime(appointDate, input.appointTimeSlot),
              },
            }
          : null,
      });
    } catch (error) {
      this.logger.warn(
        `notifyWorkerAssigned failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /**
   * 接单：派单运营仅微信；居民微信+短信。同一 ACCEPTED 模板。
   * thing3 / phone_number4 = 接单员工。不通知员工。
   */
  async notifyOrderAccepted(input: OrderAcceptedNotifyInput): Promise<void> {
    try {
      const appointDate =
        typeof input.appointDate === 'string' ? new Date(input.appointDate) : input.appointDate;
      const orderTypePath = input.orderType === 'CLEANING' ? 'cleaning' : 'recycling';
      const templateId = this.envConfigService.wechatOaTmplAccepted;
      const wechatData = {
        character_string1: input.orderNo,
        thing2: formatWechatServiceName(input.orderType, input.catalogName),
        time7: formatWechatTime('dashMinute', {
          appointDate,
          timeSlot: input.appointTimeSlot,
        }),
        thing3: truncateThing(input.workerName),
        phone_number4: input.workerPhone,
      };

      const lastAssign = await this.prisma.orderStatusLog.findFirst({
        where: {
          orderId: input.orderId,
          orderType: input.orderType,
          operatorType: 'ADMIN',
          toStatus: 'ASSIGNED',
        },
        orderBy: { createdAt: 'desc' },
        select: { operatorId: true },
      });

      const residentPhone = await this.resolveResidentPhone(input.residentId, input.contactPhone);
      const tasks: Promise<unknown>[] = [];

      if (lastAssign?.operatorId) {
        tasks.push(
          this.deliver({
            wechat: {
              target: { adminId: lastAssign.operatorId },
              templateId,
              data: wechatData,
              jump: this.adminRedirectJump(orderTypePath, input.orderId),
            },
          }),
        );
      }

      tasks.push(
        this.deliver({
          wechat: input.residentId
            ? {
                target: { residentId: input.residentId },
                templateId,
                data: wechatData,
                jump: this.residentMiniprogram(
                  residentOrderDetailPath(input.orderId, orderTypePath),
                ),
              }
            : null,
          sms: residentPhone
            ? {
                phone: residentPhone,
                templateCode: this.envConfigService.smsTmplAcceptedResident ?? '',
                templateParam: {
                  serviceName: formatSmsServiceName(input.orderType),
                  appointTime: formatSmsAppointTime(appointDate, input.appointTimeSlot),
                },
              }
            : null,
        }),
      );

      await Promise.allSettled(tasks);
    } catch (error) {
      this.logger.warn(
        `notifyOrderAccepted failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** 完工：仅居民微信，评价页。无短信。 */
  async notifyOrderCompleted(input: OrderCompletedNotifyInput): Promise<void> {
    try {
      if (!input.residentId) {
        this.logger.log('wechat skip: no residentId for completed notify reason=no_resident');
        return;
      }
      const completedAt = input.completedAt ?? new Date();
      await this.deliver({
        wechat: {
          target: { residentId: input.residentId },
          templateId: this.envConfigService.wechatOaTmplCompletedResident,
          data: {
            character_string1: input.orderNo,
            thing2: formatWechatServiceName(input.orderType, input.catalogName),
            time7: formatWechatTime('cnMonthDayHao', { at: completedAt }),
          },
          jump: this.residentMiniprogram(residentReviewPath(input.orderId, input.orderType)),
        },
      });
    } catch (error) {
      this.logger.warn(
        `notifyOrderCompleted failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** 仅居民主动取消发微信。无短信。运营取消不走此方法。 */
  async notifyOrderCancelled(input: OrderCancelledNotifyInput): Promise<void> {
    try {
      if (!input.residentId) {
        this.logger.log('wechat skip: no residentId for cancelled notify reason=no_resident');
        return;
      }
      const cancelledAt = input.cancelledAt ?? new Date();
      const orderTypePath = input.orderType === 'CLEANING' ? 'cleaning' : 'recycling';
      await this.deliver({
        wechat: {
          target: { residentId: input.residentId },
          templateId: this.envConfigService.wechatOaTmplCancelledResident,
          data: {
            character_string1: input.orderNo,
            thing12: formatWechatServiceName(input.orderType, input.catalogName),
            time3: formatWechatTime('dashSecond', { at: cancelledAt }),
          },
          jump: this.residentMiniprogram(residentOrderDetailPath(input.orderId, orderTypePath)),
        },
      });
    } catch (error) {
      this.logger.warn(
        `notifyOrderCancelled failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async scanScheduled(now = new Date()): Promise<void> {
    await this.scanAcceptTimeouts(now);
    await this.scanT30Reminders(now);
  }

  /** 仍 ASSIGNED 且距最近 ADMIN→ASSIGNED ≥15min → 该运营微信+短信。改派按新日志重计。 */
  async scanAcceptTimeouts(now = new Date()): Promise<void> {
    try {
      const [cleaning, recycling] = await Promise.all([
        this.prisma.cleaningOrder.findMany({
          where: { status: 'ASSIGNED' },
          select: { id: true, orderNo: true },
        }),
        this.prisma.recyclingOrder.findMany({
          where: { status: 'ASSIGNED' },
          select: { id: true, orderNo: true },
        }),
      ]);
      const rows: Array<{ id: number; orderNo: string; orderType: NotifyOrderType }> = [
        ...cleaning.map((row) => ({ ...row, orderType: 'CLEANING' as const })),
        ...recycling.map((row) => ({ ...row, orderType: 'RECYCLING' as const })),
      ];
      for (const row of rows) {
        await this.processAcceptTimeout(row, now);
      }
    } catch (error) {
      this.logger.warn(
        `scanAcceptTimeouts failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** T-30 仅短信：居民 + 已派员工；不发服务号微信。 */
  async scanT30Reminders(now = new Date()): Promise<void> {
    try {
      const bounds = t30AppointDateBounds(now);
      const [cleaning, recycling] = await Promise.all([
        this.prisma.cleaningOrder.findMany({
          where: {
            status: { in: [...T30_ELIGIBLE_STATUSES] },
            appointDate: { gte: bounds.gte, lte: bounds.lte },
          },
          select: {
            id: true,
            orderNo: true,
            residentId: true,
            workerId: true,
            contactPhone: true,
            appointDate: true,
            appointTimeSlot: true,
            worker: { select: { phone: true } },
          },
        }),
        this.prisma.recyclingOrder.findMany({
          where: {
            status: { in: [...T30_ELIGIBLE_STATUSES] },
            appointDate: { gte: bounds.gte, lte: bounds.lte },
          },
          select: {
            id: true,
            orderNo: true,
            residentId: true,
            workerId: true,
            contactPhone: true,
            appointDate: true,
            appointTimeSlot: true,
            worker: { select: { phone: true } },
          },
        }),
      ]);
      const rows: T30ScanRow[] = [
        ...cleaning.map((row) => ({ ...row, orderType: 'CLEANING' as const })),
        ...recycling.map((row) => ({ ...row, orderType: 'RECYCLING' as const })),
      ];
      for (const row of rows) {
        await this.processT30Reminder(row, now);
      }
    } catch (error) {
      this.logger.warn(
        `scanT30Reminders failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async processAcceptTimeout(
    row: { id: number; orderNo: string; orderType: NotifyOrderType },
    now: Date,
  ): Promise<void> {
    const lastAssign = await this.prisma.orderStatusLog.findFirst({
      where: {
        orderId: row.id,
        orderType: row.orderType,
        operatorType: 'ADMIN',
        toStatus: 'ASSIGNED',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, operatorId: true, createdAt: true },
    });
    if (!lastAssign || now.getTime() - lastAssign.createdAt.getTime() < ACCEPT_TIMEOUT_MS) {
      return;
    }

    const stillAssigned = await this.isStillAssigned(row.orderType, row.id);
    if (!stillAssigned) {
      return;
    }

    const orderTypePath = row.orderType === 'CLEANING' ? 'cleaning' : 'recycling';
    const recipientKey = `admin:${lastAssign.operatorId}:assignLog:${lastAssign.id}`;
    const adminPhone = await this.resolveAdminPhone(lastAssign.operatorId);

    const wechatClaimed = await this.claimSendLog(
      'ACCEPT_TIMEOUT',
      row.orderType,
      row.id,
      NotifyChannel.WECHAT,
      recipientKey,
    );
    const smsClaimed = await this.claimSendLog(
      'ACCEPT_TIMEOUT',
      row.orderType,
      row.id,
      NotifyChannel.SMS,
      recipientKey,
    );

    await this.deliver({
      wechat: wechatClaimed
        ? {
            target: { adminId: lastAssign.operatorId },
            templateId: this.envConfigService.wechatOaTmplAcceptTimeoutAdmin,
            data: {
              character_string1: row.orderNo,
              const2: ACCEPT_TIMEOUT_CONST2,
            },
            jump: this.adminRedirectJump(orderTypePath, row.id),
          }
        : null,
      sms:
        smsClaimed && adminPhone
          ? {
              phone: adminPhone,
              templateCode: this.envConfigService.smsTmplAcceptTimeoutAdmin ?? '',
              templateParam: { orderNo: row.orderNo },
            }
          : null,
    });
  }

  private async processT30Reminder(row: T30ScanRow, now: Date): Promise<void> {
    if (!isT30ReminderDue(row.appointDate, row.appointTimeSlot, now)) {
      return;
    }
    const dayKey = appointDateKey(row.appointDate);

    const residentPhone = await this.resolveResidentPhone(row.residentId, row.contactPhone);
    const residentClaimed = await this.claimSendLog(
      'T30_REMINDER',
      row.orderType,
      row.id,
      NotifyChannel.SMS,
      `resident:${row.residentId ?? 'none'}:${dayKey}`,
    );
    if (residentClaimed && residentPhone) {
      await this.deliver({
        sms: {
          phone: residentPhone,
          templateCode: this.envConfigService.smsTmplReminderResident ?? '',
          templateParam: { serviceName: formatSmsServiceName(row.orderType) },
        },
      });
    }

    if (!row.workerId) {
      return;
    }
    const workerPhone = row.worker?.phone?.trim() || null;
    const workerClaimed = await this.claimSendLog(
      'T30_REMINDER',
      row.orderType,
      row.id,
      NotifyChannel.SMS,
      `worker:${row.workerId}:${dayKey}`,
    );
    if (workerClaimed && workerPhone) {
      await this.deliver({
        sms: {
          phone: workerPhone,
          templateCode: this.envConfigService.smsTmplReminderWorker ?? '',
        },
      });
    }
  }

  private async isStillAssigned(orderType: NotifyOrderType, orderId: number): Promise<boolean> {
    const status =
      orderType === 'CLEANING'
        ? (
            await this.prisma.cleaningOrder.findUnique({
              where: { id: orderId },
              select: { status: true },
            })
          )?.status
        : (
            await this.prisma.recyclingOrder.findUnique({
              where: { id: orderId },
              select: { status: true },
            })
          )?.status;
    return status === 'ASSIGNED';
  }

  async claimSendLog(
    event: string,
    orderType: NotifyOrderType,
    orderId: number,
    channel: NotifyChannel,
    recipientKey: string,
  ): Promise<boolean> {
    try {
      await this.prisma.notifySendLog.create({
        data: { event, orderType, orderId, channel, recipientKey },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }
      if ((error as { code?: string }).code === 'P2002') {
        return false;
      }
      this.logger.warn(
        `notify_send_logs claim failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return false;
    }
  }

  private async resolveAdminPhone(adminId: number): Promise<string | null> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { phone: true },
    });
    return admin?.phone?.trim() || null;
  }

  private async findOrderNotifyAdmins(
    orderType: NotifyOrderType,
  ): Promise<Array<{ id: number; phone: string | null }>> {
    const menuKey = orderType === 'CLEANING' ? 'orders.cleaning' : 'orders.recycling';
    const admins = await this.prisma.admin.findMany({
      where: { status: 'ENABLED' },
      select: {
        id: true,
        phone: true,
        isSuperAdmin: true,
        permissions: { select: { menuKey: true } },
      },
    });
    return admins
      .filter(
        (admin) =>
          admin.isSuperAdmin || admin.permissions.some((permission) => permission.menuKey === menuKey),
      )
      .map((admin) => ({ id: admin.id, phone: admin.phone }));
  }

  private async resolveResidentPhone(
    residentId: number | null | undefined,
    contactPhone?: string | null,
  ): Promise<string | null> {
    const fromOrder = contactPhone?.trim();
    if (fromOrder) {
      return fromOrder;
    }
    if (!residentId) {
      return null;
    }
    const resident = await this.prisma.resident.findUnique({
      where: { id: residentId },
      select: { phone: true },
    });
    return resident?.phone ?? null;
  }

  async sendWechat(input: NotifyWechatInput): Promise<boolean> {
    try {
      if (!this.envConfigService.hasWechatOaCredentials) {
        this.logger.log('wechat skip: OA credentials unset reason=no_credentials');
        return false;
      }
      if (!input.templateId) {
        this.logger.log('wechat skip: template id unset reason=no_template');
        return false;
      }
      if ('adminId' in input.target && !this.envConfigService.hasWechatAdminH5BaseUrl) {
        this.logger.log('wechat skip: admin H5 base url unset reason=no_h5_base');
        return false;
      }
      if (input.jump?.kind === 'url' && !this.envConfigService.hasWechatAdminH5BaseUrl) {
        this.logger.log('wechat skip: admin H5 base url unset reason=no_h5_base');
        return false;
      }
      if (input.jump?.kind === 'miniprogram' && (!input.jump.appid || !input.jump.pagepath)) {
        this.logger.log('wechat skip: miniprogram jump incomplete reason=no_jump');
        return false;
      }

      const oaOpenid = await this.resolveSubscribedOaOpenid(input.target);
      if (!oaOpenid) {
        return false;
      }

      const jump = input.jump;
      return this.wechatOaService.sendTemplate({
        oaOpenid,
        templateId: input.templateId,
        data: input.data,
        url: jump?.kind === 'url' ? jump.url : undefined,
        miniprogram:
          jump?.kind === 'miniprogram'
            ? { appid: jump.appid, pagepath: jump.pagepath }
            : undefined,
      });
    } catch (error) {
      this.logger.warn(`wechat send error: ${error instanceof Error ? error.message : 'unknown'}`);
      return false;
    }
  }

  async sendSms(input: SmsSendInput): Promise<boolean> {
    try {
      if (!input.phone) {
        this.logger.log('sms skip: no phone reason=no_phone');
        return false;
      }
      if (!input.templateCode) {
        this.logger.log('sms skip: template code unset reason=no_template');
        return false;
      }
      return this.smsService.send(input);
    } catch (error) {
      this.logger.warn(`sms send error: ${error instanceof Error ? error.message : 'unknown'}`);
      return false;
    }
  }

  workerMiniprogram(pagepath: string): NotifyWechatJump | undefined {
    if (!this.envConfigService.wechatMpReleased) {
      // 服务号模板不能跳体验版；未发正式版时去掉 miniprogram，避免整条 40165，通知仍可送达
      this.logger.log('wechat: omit miniprogram jump (WECHAT_MP_RELEASED!=true)');
      return undefined;
    }
    const appid = this.envConfigService.wechatWorkerAppId;
    if (!appid) {
      this.logger.log('wechat skip: worker appid unset reason=no_mp_appid');
      return undefined;
    }
    return { kind: 'miniprogram', appid, pagepath };
  }

  residentMiniprogram(pagepath: string): NotifyWechatJump | undefined {
    if (!this.envConfigService.wechatMpReleased) {
      this.logger.log('wechat: omit miniprogram jump (WECHAT_MP_RELEASED!=true)');
      return undefined;
    }
    const appid = this.envConfigService.wechatCustomerAppId;
    if (!appid) {
      this.logger.log('wechat skip: customer appid unset reason=no_mp_appid');
      return undefined;
    }
    return { kind: 'miniprogram', appid, pagepath };
  }

  adminRedirectJump(orderType: 'cleaning' | 'recycling', orderId: number): NotifyWechatJump | undefined {
    if (!this.envConfigService.hasWechatAdminH5BaseUrl) {
      return undefined;
    }
    const apiBase = this.envConfigService.serverBaseUrl;
    if (!apiBase) {
      this.logger.log('wechat skip: SERVER_BASE_URL unset for admin redirect reason=no_api_base');
      return undefined;
    }
    const origin = apiBase.replace(/\/+$/, '');
    return {
      kind: 'url',
      url: `${origin}/api/v1/wechat/oa/redirect?type=${orderType}&id=${orderId}`,
    };
  }

  private async resolveSubscribedOaOpenid(target: NotifyWechatTarget): Promise<string | null> {
    const follower =
      'adminId' in target
        ? await this.prisma.wechatOaFollower.findUnique({ where: { adminId: target.adminId } })
        : 'workerId' in target
          ? await this.prisma.wechatOaFollower.findUnique({ where: { workerId: target.workerId } })
          : await this.prisma.wechatOaFollower.findUnique({
              where: { residentId: target.residentId },
            });

    if (!follower?.oaOpenid) {
      this.logger.log('wechat skip: follower not bound reason=unbound');
      return null;
    }
    if (!follower.subscribed) {
      this.logger.log('wechat skip: unsubscribed reason=unsubscribed');
      return null;
    }
    return follower.oaOpenid;
  }
}
