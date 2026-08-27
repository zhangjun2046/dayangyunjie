import { describe, expect, it } from 'vitest';

import type { WorkerListItem } from '@/api/worker';

import { filterAssignableWorkers, skillLabel, type OrderSkillType } from './worker-skill';

function makeWorker(overrides: Partial<WorkerListItem> = {}): WorkerListItem {
  return {
    id: 1,
    name: '测试员工',
    phone: '13800000000',
    employeeNo: 'WK0001',
    skillType: 'CLEANING',
    status: 'IDLE',
    employmentStatus: 'ACTIVE',
    rating: 5,
    totalOrders: 0,
    todayOrders: 0,
    ...overrides,
  };
}

describe('skillLabel', () => {
  it.each([
    ['CLEANING', '保洁'],
    ['RECYCLING', '收废品'],
    ['BOTH', '保洁和收废品'],
    [undefined, '—'],
    [null, '—'],
    ['', ''],
    ['UNKNOWN', 'UNKNOWN'],
    ['cleaning', 'cleaning'],
    [' BOTH ', ' BOTH '],
  ])('输入 %s 时返回 %s', (skillType, expected) => {
    expect(skillLabel(skillType)).toBe(expected);
  });
});

describe.each<{
  orderSkillType: OrderSkillType;
  ownSkillType: string;
  otherSkillType: string;
}>([
  {
    orderSkillType: 'CLEANING',
    ownSkillType: 'CLEANING',
    otherSkillType: 'RECYCLING',
  },
  {
    orderSkillType: 'RECYCLING',
    ownSkillType: 'RECYCLING',
    otherSkillType: 'CLEANING',
  },
])('$orderSkillType 订单候选人员过滤', ({ orderSkillType, ownSkillType, otherSkillType }) => {
  it('保留空闲且技能匹配的人员', () => {
    const worker = makeWorker({ skillType: ownSkillType });

    expect(filterAssignableWorkers([worker], orderSkillType)).toEqual([worker]);
  });

  it('保留空闲且具备双技能的人员', () => {
    const worker = makeWorker({ skillType: 'BOTH' });

    expect(filterAssignableWorkers([worker], orderSkillType)).toEqual([worker]);
  });

  it('排除空闲但技能不匹配的人员', () => {
    const worker = makeWorker({ skillType: otherSkillType });

    expect(filterAssignableWorkers([worker], orderSkillType)).toEqual([]);
  });

  it('排除忙碌且技能匹配的人员', () => {
    const worker = makeWorker({ status: 'BUSY', skillType: ownSkillType });

    expect(filterAssignableWorkers([worker], orderSkillType)).toEqual([]);
  });

  it('排除离职且技能匹配的人员', () => {
    const worker = makeWorker({ employmentStatus: 'RESIGNED', skillType: ownSkillType });

    expect(filterAssignableWorkers([worker], orderSkillType)).toEqual([]);
  });

  it('排除忙碌的双技能人员', () => {
    const worker = makeWorker({ status: 'BUSY', skillType: 'BOTH' });

    expect(filterAssignableWorkers([worker], orderSkillType)).toEqual([]);
  });

  it('排除缺失技能的异常数据', () => {
    const worker = makeWorker({ skillType: undefined as unknown as string });

    expect(filterAssignableWorkers([worker], orderSkillType)).toEqual([]);
  });

  it('排除缺失状态的异常数据', () => {
    const worker = makeWorker({ status: undefined as unknown as WorkerListItem['status'] });

    expect(filterAssignableWorkers([worker], orderSkillType)).toEqual([]);
  });

  it('空列表返回空列表', () => {
    expect(filterAssignableWorkers([], orderSkillType)).toEqual([]);
  });
});

describe('filterAssignableWorkers 综合场景', () => {
  const workers = [
    makeWorker({ id: 1, skillType: 'CLEANING', status: 'IDLE' }),
    makeWorker({ id: 2, skillType: 'RECYCLING', status: 'IDLE' }),
    makeWorker({ id: 3, skillType: 'BOTH', status: 'IDLE' }),
    makeWorker({ id: 4, skillType: 'CLEANING', status: 'BUSY' }),
    makeWorker({ id: 5, skillType: 'RECYCLING', status: 'BUSY' }),
    makeWorker({ id: 6, skillType: 'BOTH', status: 'BUSY' }),
  ];

  it('混合数据中保洁订单仅返回空闲保洁和双技能人员', () => {
    expect(filterAssignableWorkers(workers, 'CLEANING').map((worker) => worker.id)).toEqual([1, 3]);
  });

  it('混合数据中回收订单仅返回空闲回收和双技能人员', () => {
    expect(filterAssignableWorkers(workers, 'RECYCLING').map((worker) => worker.id)).toEqual([2, 3]);
  });

  it('空闲双技能人员同时出现在两类订单候选列表', () => {
    const cleaningIds = filterAssignableWorkers(workers, 'CLEANING').map((worker) => worker.id);
    const recyclingIds = filterAssignableWorkers(workers, 'RECYCLING').map((worker) => worker.id);

    expect(cleaningIds).toContain(3);
    expect(recyclingIds).toContain(3);
  });

  it('保持原始顺序且不修改输入数组', () => {
    const snapshot = [...workers];

    expect(filterAssignableWorkers(workers, 'CLEANING').map((worker) => worker.id)).toEqual([1, 3]);
    expect(workers).toEqual(snapshot);
  });

  it('不会按员工编号去重', () => {
    const duplicateWorkers = [
      makeWorker({ id: 7, skillType: 'CLEANING' }),
      makeWorker({ id: 7, skillType: 'CLEANING' }),
    ];

    expect(filterAssignableWorkers(duplicateWorkers, 'CLEANING')).toHaveLength(2);
  });
});
