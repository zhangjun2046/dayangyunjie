import { OrderSource } from '@dayangyunjie/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRecyclingOrderDto {
  @ApiProperty({ description: '居民 ID（公开接口联调阶段显式必填）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  residentId!: number;

  @ApiProperty({ description: '物品大类', example: '大件类', enum: ['大件类', '小件类'] })
  @IsString()
  @MaxLength(64)
  serviceItem!: string;

  @ApiProperty({ description: '预估重量（kg），供员工确认搬运工具', example: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  estimatedWeight!: number;

  @ApiProperty({ description: '预约日期（ISO 日期）', example: '2026-06-08' })
  @IsDateString()
  appointDate!: string;

  @ApiProperty({ description: '预约时段', example: '14:00-16:00' })
  @IsString()
  @MaxLength(32)
  appointTimeSlot!: string;

  @ApiProperty({ description: '地址 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId!: number;

  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString()
  @MaxLength(32)
  contactName!: string;

  @ApiProperty({ description: '联系人手机号', example: '13800138000' })
  @IsString()
  @MaxLength(20)
  contactPhone!: string;

  @ApiPropertyOptional({ description: '备注', example: '请提前电话联系' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;

  @ApiPropertyOptional({
    description: '订单来源',
    enum: Object.values(OrderSource),
    default: OrderSource.MINIPROGRAM,
  })
  @IsOptional()
  @IsIn(Object.values(OrderSource))
  source?: (typeof OrderSource)[keyof typeof OrderSource] = OrderSource.MINIPROGRAM;

  @ApiPropertyOptional({ description: '是否代下单', example: false, default: false })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isProxyOrder?: boolean = false;

  @ApiPropertyOptional({ description: '代下单服务对象姓名', example: '李阿姨' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  proxyName?: string;

  @ApiPropertyOptional({ description: '代下单服务对象手机号', example: '13900001111' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  proxyPhone?: string;
}
