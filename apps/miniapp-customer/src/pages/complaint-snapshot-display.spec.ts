import { describe, expect, it } from 'vitest';
// @ts-expect-error Vite 在测试构建时将 Vue 文件作为原始文本载入。
import complaintListSource from './complaint-list/index.vue?raw';
// @ts-expect-error Vite 在测试构建时将 Vue 文件作为原始文本载入。
import complaintDetailSource from './complaint-detail/index.vue?raw';
// @ts-expect-error Vite 在测试构建时将 Vue 文件作为原始文本载入。
import orderDetailSource from './order-detail/index.vue?raw';

const pageSources = [
  ['complaint-list', complaintListSource, 'formatComplaintReasons(item.reasons)'],
  ['complaint-detail', complaintDetailSource, 'formatComplaintReasons(complaint.reasons)'],
  ['order-detail', orderDetailSource, 'formatComplaintReasons(complaint.reasons)'],
] as const;

describe('complaint reason snapshot display', () => {
  it.each(pageSources)('%s 直接展示 reasons 快照且不加载动态原因配置', (_page, source, field) => {
    expect(source).toContain(field);
    expect(source).not.toContain('reasonLabel');
    expect(source).not.toContain('useComplaintReasons');
    expect(source).not.toContain('getReasonLabel');
  });
});
