import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/** 新增投诉原因配置参数 */
export class CreateComplaintReasonConfigDto {
  @ApiProperty({ description: '投诉原因展示文案', example: '服务态度差' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  label!: string;

  @ApiPropertyOptional({ description: '排序值，越小越靠前', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean = true;
}
