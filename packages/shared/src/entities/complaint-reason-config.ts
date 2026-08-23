/** 投诉原因配置 API 出参 */
export interface ComplaintReasonConfigDto {
  id: number;
  label: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
