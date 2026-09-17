import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MENU_TREE } from './menu-permissions';

const routerSource = readFileSync(new URL('../router/index.ts', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../layout/index.vue', import.meta.url), 'utf8');
const menuKeysSource = readFileSync(
  new URL(
    '../../../server/src/modules/admin-permission/constants/menu-keys.constant.ts',
    import.meta.url,
  ),
  'utf8',
);

describe('appoint time slot navigation contract', () => {
  it('路由名称、标题和权限 key 保持一致', () => {
    expect(routerSource).toContain("path: 'config/appoint-time-slots'");
    expect(routerSource).toContain("name: 'ConfigAppointTimeSlots'");
    expect(routerSource).toContain(
      "meta: { title: '预约时段', menuKey: 'config.appoint-time-slots' }",
    );
  });

  it('侧栏菜单使用同一路径、名称和权限 key', () => {
    expect(layoutSource).toContain("userStore.hasMenu('config.appoint-time-slots')");
    expect(layoutSource).toContain('index="/config/appoint-time-slots"');
    expect(layoutSource).toContain('<span>预约时段</span>');
    expect(layoutSource).toContain("'config.appoint-time-slots'");
  });

  it('权限树与后端 menuKey 字典同步声明预约时段', () => {
    const configGroup = MENU_TREE.find((group) => group.key === 'group-config');
    expect(configGroup?.children).toContainEqual({
      key: 'config.appoint-time-slots',
      label: '预约时段',
    });
    expect(menuKeysSource).toContain("'config.appoint-time-slots'");
  });
});
