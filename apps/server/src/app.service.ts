import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@dayangyunjie/shared';

@Injectable()
export class AppService {
  getHealth(): {
    status: string;
    version: string;
    timestamp: string;
    /** P1.3：验证 @dayangyunjie/shared 可被 Nest 引用 */
    orderStatusSample: typeof OrderStatus.PENDING_ASSIGN;
  } {
    return {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      orderStatusSample: OrderStatus.PENDING_ASSIGN,
    };
  }
}
