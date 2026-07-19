/**
 * P5.8b 功能授权：页面级权限节点字典（对应 requirement_v2.0.md §5.0 导航二级菜单末级节点）。
 * 与前端 apps/admin/src/constants/menu-permissions.ts 保持一致，双端各自硬编码维护。
 */
export const ALL_MENU_KEYS = [
  'orders.cleaning',
  'orders.recycling',
  'orders.consult',
  'orders.complaint',
  'data.dashboard',
  'staff.workers',
  'config.services',
  'config.operators',
  'config.banners',
  'system.users',
  'system.permissions',
] as const;

export type MenuKey = (typeof ALL_MENU_KEYS)[number];

/** 用户管理 / 功能授权本身始终仅超级管理员可用，不对外分配 */
export const SUPER_ADMIN_ONLY_MENU_KEYS: readonly MenuKey[] = ['system.users', 'system.permissions'];
