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

describe('recycling item navigation contract', () => {
  it('路由名称、标题和权限 key 保持一致', () => {
    expect(routerSource).toContain("path: 'config/recycling-items'");
    expect(routerSource).toContain("name: 'ConfigRecyclingItems'");
    expect(routerSource).toContain(
      "meta: { title: '回收品项', menuKey: 'config.recycling-items' }",
    );
  });

  it('侧栏菜单使用同一路径、名称和权限 key', () => {
    expect(layoutSource).toContain("userStore.hasMenu('config.recycling-items')");
    expect(layoutSource).toContain('index="/config/recycling-items"');
    expect(layoutSource).toContain('<span>回收品项</span>');
    expect(layoutSource).toContain("'config.recycling-items'");
  });

  it('权限树与后端 menuKey 字典同步声明回收品项', () => {
    const configGroup = MENU_TREE.find((group) => group.key === 'group-config');
    expect(configGroup?.children).toContainEqual({
      key: 'config.recycling-items',
      label: '回收品项',
    });
    expect(menuKeysSource).toContain("'config.recycling-items'");
  });
});
