import type { WorkerListItem } from '@/api/worker';

export type OrderSkillType = 'CLEANING' | 'RECYCLING';

/** 将服务人员技能编码转换为管理端展示文案。 */
export function skillLabel(skillType?: string | null): string {
  if (skillType === 'CLEANING') return '保洁';
  if (skillType === 'RECYCLING') return '收废品';
  if (skillType === 'BOTH') return '保洁和收废品';
  return skillType ?? '—';
}

/** 按空闲状态和订单技能筛选可分配的服务人员，BOTH 可承接两类订单。 */
export function filterAssignableWorkers(
  workers: readonly WorkerListItem[],
  orderSkillType: OrderSkillType,
): WorkerListItem[] {
  return workers.filter(
    (worker) =>
      worker.status === 'IDLE' &&
      (worker.skillType === orderSkillType || worker.skillType === 'BOTH'),
  );
}
