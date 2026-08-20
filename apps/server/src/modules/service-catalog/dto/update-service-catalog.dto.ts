import { BizType } from '@dayangyunjie/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const BIZ_TYPE_VALUES = Object.values(BizType);

export class UpdateServiceCatalogDto {
  @ApiPropertyOptional({ description: '业务大类', enum: BIZ_TYPE_VALUES })
  @IsOptional()
  @IsIn(BIZ_TYPE_VALUES)
  bizType?: (typeof BIZ_TYPE_VALUES)[number];

  @ApiPropertyOptional({ description: '服务名称', example: '普通保洁' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({ description: '副标题' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  subtitle?: string;

  @ApiPropertyOptional({ description: '图标 URL；传 null 可清除图标', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  icon?: string | null;

  @ApiPropertyOptional({ description: '排序权重', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
