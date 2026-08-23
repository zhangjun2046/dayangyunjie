import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MENU_TREE } from './menu-permissions';

const routerSource = readFileSync(
  new URL('../router/index.ts', import.meta.url),
  'utf8',
);
const layoutSource = readFileSync(
  new URL('../layout/index.vue', import.meta.url),
  'utf8',
);

describe('complaint reason config navigation contract', () => {
  it('路由名称、标题和权限 key 保持一致', () => {
    expect(routerSource).toContain("path: 'config/review-keywords'");
    expect(routerSource).toContain("name: 'ConfigReviewKeywords'");
    expect(routerSource).toContain(
      "meta: { title: '关键词配置', menuKey: 'config.review-keywords' }",
    );
  });

  it('侧栏菜单使用同一路径、名称和权限 key', () => {
    expect(layoutSource).toContain("userStore.hasMenu('config.review-keywords')");
    expect(layoutSource).toContain('index="/config/review-keywords"');
    expect(layoutSource).toContain('<span>关键词配置</span>');
  });

  it('权限树声明关键词配置叶子节点', () => {
    const configGroup = MENU_TREE.find((group) => group.key === 'group-config');
    expect(configGroup?.children).toContainEqual({
      key: 'config.review-keywords',
      label: '关键词配置',
    });
  });
});
