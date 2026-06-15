/** 轮播图展示目标 */
export type BannerDisplayTarget = 'RESIDENT' | 'WORKER' | 'ALL';

/** 轮播图链接类型 */
export type BannerLinkType = 'NONE' | 'PAGE' | 'URL';

/** 轮播图（API 出参，v2.0） */
export interface BannerDto {
  id: number;
  imageUrl: string;
  title?: string | null;
  displayTarget: BannerDisplayTarget;
  linkType: BannerLinkType;
  linkTarget?: string | null;
  startTime: string;
  endTime: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
