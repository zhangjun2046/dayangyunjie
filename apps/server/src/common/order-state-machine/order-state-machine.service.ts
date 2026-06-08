import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

/** 订单类型 — 状态机内部使用，不依赖 shared 常量以保持 common 层零耦合 */
export type OrderTypeKey = 'CLEANING' | 'RECYCLING';

/** 操作人类型 */
export type OperatorTypeKey = 'RESIDENT' | 'WORKER' | 'ADMIN';

/** 调用 transition() 所需参数 */
export interface TransitionParams {
  /** 订单数据库主键 */
  orderId: number;
  /** 订单业务类型 */
  orderType: OrderTypeKey;
  /** 变更前状态 */
  fromStatus: string;
  /** 目标状态 */
  toStatus: string;
  /** 操作人 ID */
  operatorId: number;
  /** 操作人类型 */
  operatorType: OperatorTypeKey;
  /** 可选备注（取消原因、GPS 超距说明等） */
  remark?: string;
}

/**
 * 合法状态转移规则表
 * key   = 当前状态
 * value = 允许转入的目标状态集合
 *
 * CLEANING 规则（§8.2）：
 *   PENDING_ASSIGN → ASSIGNED / CANCELLED
 *   ASSIGNED       → ACCEPTED
 *   ACCEPTED       → IN_SERVICE
 *   IN_SERVICE     → PENDING_REVIEW
 *   PENDING_REVIEW → REVIEWED
 *   REVIEWED / CANCELLED = 终态，不可再转移
 *
 * RECYCLING 规则（§8.4，2026-06-08 确认版）：
 *   废品流程与保洁完全一致，无 PENDING_ACCEPTANCE 节点。
 *   IN_SERVICE → PENDING_REVIEW（员工完成服务并上传照片后直接流转）
 */
const TRANSITION_RULES: Record<OrderTypeKey, Record<string, string[]>> = {
  CLEANING: {
    PENDING_ASSIGN: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['ACCEPTED'],
    ACCEPTED: ['IN_SERVICE'],
    IN_SERVICE: ['PENDING_REVIEW'],
    PENDING_REVIEW: ['REVIEWED'],
    // 终态：REVIEWED、CANCELLED — 无可转移目标
  },
  RECYCLING: {
    PENDING_ASSIGN: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['ACCEPTED'],
    ACCEPTED: ['IN_SERVICE'],
    IN_SERVICE: ['PENDING_REVIEW'],
    PENDING_REVIEW: ['REVIEWED'],
    // 终态：REVIEWED、CANCELLED — 无可转移目标
  },
};

/** 终态集合：进入后不允许任何转移 */
const TERMINAL_STATUSES = new Set(['REVIEWED', 'CANCELLED']);

@Injectable()
export class OrderStateMachineService {
  /**
   * 校验指定订单类型的状态转移是否合法。
   * - 终态保护：REVIEWED / CANCELLED 不可再转移
   * - 取消专项：目标为 CANCELLED 且当前状态非 PENDING_ASSIGN，返回专用提示
   * - 其余非法转移：说明当前状态与目标状态
   *
   * @throws BadRequestException 转移非法时抛出
   */
  validateTransition(orderType: OrderTypeKey, fromStatus: string, toStatus: string): void {
    // 终态不可再转移
    if (TERMINAL_STATUSES.has(fromStatus)) {
      throw new BadRequestException(
        `当前订单已处于终态（${fromStatus}），不可再变更状态`,
      );
    }

    // 取消专项：非 PENDING_ASSIGN 不允许取消
    if (toStatus === 'CANCELLED' && fromStatus !== 'PENDING_ASSIGN') {
      throw new BadRequestException(
        '当前订单状态不允许取消，请联系客服',
      );
    }

    const allowedTargets = TRANSITION_RULES[orderType]?.[fromStatus] ?? [];
    if (!allowedTargets.includes(toStatus)) {
      throw new BadRequestException(
        `非法状态转移：当前状态 ${fromStatus} 不允许变更为 ${toStatus}`,
      );
    }
  }

  /**
   * 在同一 Prisma 事务中执行状态转移：
   * 1. 校验转移合法性
   * 2. 更新对应订单表的 status 字段
   * 3. 写入 order_status_logs 审计记录
   *
   * 调用方须自行提供事务客户端（`prisma.$transaction` 内部的 tx）。
   *
   * @returns 新状态字符串
   */
  async transition(tx: Prisma.TransactionClient, params: TransitionParams): Promise<string> {
    const { orderId, orderType, fromStatus, toStatus, operatorId, operatorType, remark } = params;

    this.validateTransition(orderType, fromStatus, toStatus);

    // 更新目标订单表的状态（toStatus 已通过 validateTransition 校验合法）
    const prismaStatus = toStatus as OrderStatus;
    if (orderType === 'CLEANING') {
      await tx.cleaningOrder.update({
        where: { id: orderId },
        data: { status: prismaStatus },
      });
    } else {
      await tx.recyclingOrder.update({
        where: { id: orderId },
        data: { status: prismaStatus },
      });
    }

    // 写入审计日志
    await tx.orderStatusLog.create({
      data: {
        orderId,
        orderType,
        fromStatus,
        toStatus,
        operatorId,
        operatorType,
        remark: remark ?? null,
      },
    });

    return toStatus;
  }
}
