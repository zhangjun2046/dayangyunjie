import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
}
