import { OrderSource } from '@dayangyunjie/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecyclingOrderSelectedItemDto {
  @ApiProperty({ description: '下单当时的品项 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemId!: number;

  @ApiProperty({ description: '品项名称快照', example: '纸张' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @ApiProperty({ description: '金额展示文案快照', example: '0.6元/kg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  priceText!: string;

  @ApiProperty({ description: '数量；小件恒为 1，大件为步进器值', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateRecyclingOrderDto {
  @ApiPropertyOptional({ description: '居民 ID（小程序用户创建时必填，管理后台代下单可不填）', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  residentId?: number;

  @ApiProperty({ description: '物品大类', example: '大件类', enum: ['大件类', '小件类'] })
  @IsString()
  @MaxLength(64)
  serviceItem!: string;

  @ApiProperty({ description: '预估重量（kg），供员工确认搬运工具', example: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  estimatedWeight!: number;

  @ApiPropertyOptional({
    description: '选中的回收品项快照；不传则按旧代下单处理',
    type: [RecyclingOrderSelectedItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecyclingOrderSelectedItemDto)
  selectedItems?: RecyclingOrderSelectedItemDto[];

  @ApiPropertyOptional({ description: '是否有电梯', example: true })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  hasElevator?: boolean;

  @ApiPropertyOptional({ description: '搬运楼层，大件 / 小件必填，1～30', example: 6, minimum: 1, maximum: 30 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  carryFloor?: number;

  @ApiProperty({ description: '预约日期（ISO 日期）', example: '2026-06-08' })
  @IsDateString()
  appointDate!: string;

  @ApiProperty({ description: '预约时段（起始时间，如 14:00）', example: '14:00' })
  @IsString()
  @MaxLength(32)
  appointTimeSlot!: string;

  @ApiPropertyOptional({ description: '地址 ID（小程序用户创建时使用；与 addressSnapshotText 二选一）', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;

  @ApiPropertyOptional({ description: '地址文本（管理后台代下单时直接传入，与 addressId 二选一）', example: '北京市朝阳区弘善家园90号楼' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  addressSnapshotText?: string;

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

  @ApiPropertyOptional({ description: '被服务人姓名（代下单时填写）', example: '李阿姨' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  serviceContactName?: string;

  @ApiPropertyOptional({ description: '被服务人手机号（代下单时填写）', example: '13900001111' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  serviceContactPhone?: string;
}
