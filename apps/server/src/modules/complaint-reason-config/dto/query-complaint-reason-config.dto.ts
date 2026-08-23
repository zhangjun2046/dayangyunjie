import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** 管理端投诉原因配置分页查询参数 */
export class QueryComplaintReasonConfigDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional({ description: '投诉原因配置 ID' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ description: '展示文案模糊查询' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  label?: string;

  @ApiPropertyOptional({ description: '启用状态' })
  @Transform(({ obj, key, value }) => {
    const rawValue = (obj as Record<string, unknown>)[key];
    if (rawValue === 'true' || rawValue === true) return true;
    if (rawValue === 'false' || rawValue === false) return false;
    return rawValue ?? value;
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
