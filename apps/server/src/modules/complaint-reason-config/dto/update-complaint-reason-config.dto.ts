import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/** 投诉原因配置可编辑字段；主键与启用状态不在此接口修改 */
export class UpdateComplaintReasonConfigDto {
  @ApiPropertyOptional({ description: '展示文案' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  label?: string;

  @ApiPropertyOptional({ description: '排序值，越小越靠前' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
