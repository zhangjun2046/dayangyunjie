/**
 * 测试用派单脚本
 * 将所有 PENDING_ASSIGN 状态的保洁订单和废品回收订单
 * 分配给手机号 13810779999 的员工（workerId = 2）
 *
 * 操作内容（与 CleaningOrderService.assignOrder 逻辑一致）：
 *   1. 更新订单 workerId
 *   2. 更新订单状态 PENDING_ASSIGN → ASSIGNED
 *   3. 写入 order_status_logs 审计记录
 */

const { PrismaClient } = require('../../node_modules/@prisma/client');

const prisma = new PrismaClient();

const TARGET_PHONE = '13810779999';
// 操作人使用 id=1 的管理员（若无管理员则记录 operatorId=0 仅作测试）
const OPERATOR_ID = 1;

async function main() {
  // 1. 查找目标员工
  const worker = await prisma.worker.findUnique({
    where: { phone: TARGET_PHONE },
    select: { id: true, name: true, phone: true, skillType: true },
  });

  if (!worker) {
    console.error(`[ERROR] 未找到手机号为 ${TARGET_PHONE} 的员工`);
    process.exit(1);
  }
  console.info(`[INFO] 目标员工: id=${worker.id}, name=${worker.name}, skillType=${worker.skillType}`);

  // 2. 查询所有待派单的保洁订单
  const cleaningOrders = await prisma.cleaningOrder.findMany({
    where: { status: 'PENDING_ASSIGN' },
    select: { id: true, orderNo: true, status: true },
  });
  console.info(`[INFO] 待派单保洁订单数量: ${cleaningOrders.length}`);

  // 3. 查询所有待派单的废品回收订单
  const recyclingOrders = await prisma.recyclingOrder.findMany({
    where: { status: 'PENDING_ASSIGN' },
    select: { id: true, orderNo: true, status: true },
  });
  console.info(`[INFO] 待派单废品回收订单数量: ${recyclingOrders.length}`);

  // 4. 逐单事务派单（保洁）
  let cleaningAssigned = 0;
  for (const order of cleaningOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        // 更新 workerId
        await tx.cleaningOrder.update({
          where: { id: order.id },
          data: { workerId: worker.id },
        });
        // 更新状态
        await tx.cleaningOrder.update({
          where: { id: order.id },
          data: { status: 'ASSIGNED' },
        });
        // 写入审计日志
        await tx.orderStatusLog.create({
          data: {
            orderId: order.id,
            orderType: 'CLEANING',
            fromStatus: 'PENDING_ASSIGN',
            toStatus: 'ASSIGNED',
            operatorId: OPERATOR_ID,
            operatorType: 'ADMIN',
            remark: '测试脚本派单',
          },
        });
      });
      cleaningAssigned++;
      console.info(`[INFO] 保洁订单 ${order.orderNo} (id=${order.id}) 派单成功 → workerId=${worker.id}, status=ASSIGNED`);
    } catch (err) {
      console.error(`[ERROR] 保洁订单 ${order.orderNo} (id=${order.id}) 派单失败:`, err.message);
    }
  }

  // 5. 逐单事务派单（废品回收）
  let recyclingAssigned = 0;
  for (const order of recyclingOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        // 更新 workerId
        await tx.recyclingOrder.update({
          where: { id: order.id },
          data: { workerId: worker.id },
        });
        // 更新状态
        await tx.recyclingOrder.update({
          where: { id: order.id },
          data: { status: 'ASSIGNED' },
        });
        // 写入审计日志
        await tx.orderStatusLog.create({
          data: {
            orderId: order.id,
            orderType: 'RECYCLING',
            fromStatus: 'PENDING_ASSIGN',
            toStatus: 'ASSIGNED',
            operatorId: OPERATOR_ID,
            operatorType: 'ADMIN',
            remark: '测试脚本派单',
          },
        });
      });
      recyclingAssigned++;
      console.info(`[INFO] 废品订单 ${order.orderNo} (id=${order.id}) 派单成功 → workerId=${worker.id}, status=ASSIGNED`);
    } catch (err) {
      console.error(`[ERROR] 废品订单 ${order.orderNo} (id=${order.id}) 派单失败:`, err.message);
    }
  }

  console.info(`\n[DONE] 派单完成！保洁订单: ${cleaningAssigned}/${cleaningOrders.length}，废品订单: ${recyclingAssigned}/${recyclingOrders.length}`);

  // 6. 验证结果
  const assignedCleaning = await prisma.cleaningOrder.count({ where: { workerId: worker.id, status: 'ASSIGNED' } });
  const assignedRecycling = await prisma.recyclingOrder.count({ where: { workerId: worker.id, status: 'ASSIGNED' } });
  console.info(`[VERIFY] 员工 ${worker.name}(${TARGET_PHONE}) 当前 ASSIGNED 保洁单: ${assignedCleaning}，废品单: ${assignedRecycling}`);
}

main()
  .catch((err) => {
    console.error('[FATAL]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
