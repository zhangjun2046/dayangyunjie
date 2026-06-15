import { OrderSource } from '@dayangyunjie/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateConsultOrderDto {
  @ApiProperty({ description: '咨询服务类型（保姆 / 月嫂 / 育儿嫂 / 陪诊 / 代买菜等）', example: '家政咨询' })
  @IsString()
  @MaxLength(32)
  serviceType!: string;

  @ApiProperty({ description: '联系人姓名（下单人）', example: '张三' })
  @IsString()
  @MaxLength(32)
  contactName!: string;

  @ApiProperty({ description: '联系人手机号（下单人）', example: '13800138000' })
  @IsString()
  @MaxLength(20)
  contactPhone!: string;

  @ApiProperty({ description: '核心诉求描述', example: '需要保洁阿姨每周两次，每次2小时' })
  @IsString()
  @MaxLength(1000)
  requirementDesc!: string;

  @ApiPropertyOptional({ description: '居民 ID（小程序登录用户可选传入）', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  residentId?: number;

  @ApiPropertyOptional({
    description: '订单来源',
    enum: Object.values(OrderSource),
    default: OrderSource.MINIPROGRAM,
  })
  @IsOptional()
  @IsIn(Object.values(OrderSource))
  source?: (typeof OrderSource)[keyof typeof OrderSource];

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

  @ApiPropertyOptional({ description: '服务地址（家政上门地址，自由文本，无需关联 addressId）', example: '北京市朝阳区建国路88号' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  serviceAddress?: string;

  @ApiPropertyOptional({ description: '备注', example: '请优先安排有经验的阿姨' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}
