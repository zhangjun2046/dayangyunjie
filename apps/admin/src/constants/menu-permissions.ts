/**
 * P5.8b 功能授权：页面级权限节点字典（对应管理端导航二级菜单末级节点）。
 * 前端硬编码维护，与后端 apps/server/src/modules/admin-permission/constants/menu-keys.constant.ts 保持一致。
 */

export interface MenuLeafNode {
  /** 权限节点 key，与后端 AdminPermission.menuKey 对应 */
  key: string;
  label: string;
}

export interface MenuGroupNode {
  /** 分组节点仅用于 el-tree 展示分类，不作为权限节点下发保存 */
  key: string;
  label: string;
  children: MenuLeafNode[];
}

/** 用户管理 / 功能授权本身始终仅超级管理员可用，权限树中展示但对普通管理员目标禁用勾选 */
export const SUPER_ADMIN_ONLY_MENU_KEYS: readonly string[] = ['system.users', 'system.permissions'];

export const MENU_TREE: MenuGroupNode[] = [
  {
    key: 'group-orders',
    label: '订单管理',
    children: [
      { key: 'orders.cleaning', label: '保洁订单' },
      { key: 'orders.recycling', label: '废品订单' },
      { key: 'orders.consult', label: '家政订单' },
      { key: 'orders.complaint', label: '投诉反馈' },
    ],
  },
  {
    key: 'group-data',
    label: '数据管理',
    children: [{ key: 'data.dashboard', label: '数据看板' }],
  },
  {
    key: 'group-staff',
    label: '员工管理',
    children: [{ key: 'staff.workers', label: '服务人员管理' }],
  },
  {
    key: 'group-config',
    label: '配置管理',
    children: [
      { key: 'config.services', label: '服务配置' },
      { key: 'config.review-keywords', label: '关键词配置' },
      { key: 'config.operators', label: '运营人员配置' },
      { key: 'config.banners', label: '轮播图管理' },
    ],
  },
  {
    key: 'group-system',
    label: '系统管理',
    children: [
      { key: 'system.users', label: '用户管理' },
      { key: 'system.permissions', label: '功能授权' },
    ],
  },
];

/** 全部叶子节点 menuKey（供全选/取消全选、校验使用） */
export const ALL_MENU_KEYS: string[] = MENU_TREE.flatMap((group) => group.children.map((leaf) => leaf.key));
