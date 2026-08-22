import { describe, expect, it } from 'vitest';
// @ts-expect-error Vite 在测试构建时将 Vue 文件作为原始文本载入。
import complaintListSource from './complaint-list/index.vue?raw';
// @ts-expect-error Vite 在测试构建时将 Vue 文件作为原始文本载入。
import complaintDetailSource from './complaint-detail/index.vue?raw';
// @ts-expect-error Vite 在测试构建时将 Vue 文件作为原始文本载入。
import orderDetailSource from './order-detail/index.vue?raw';

const pageSources = [
  ['complaint-list', complaintListSource, 'item.reasonLabel'],
  ['complaint-detail', complaintDetailSource, 'complaint.reasonLabel'],
  ['order-detail', orderDetailSource, 'complaint.reasonLabel'],
] as const;

describe('complaint reason snapshot display', () => {
  it.each(pageSources)('%s 直接展示接口 reasonLabel 且不加载动态原因配置', (_page, source, field) => {
    expect(source).toContain(field);
    expect(source).not.toContain('useComplaintReasons');
    expect(source).not.toContain('getReasonLabel');
  });
});
