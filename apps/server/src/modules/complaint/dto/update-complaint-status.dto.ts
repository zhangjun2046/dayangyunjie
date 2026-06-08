import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

const COMPLAINT_STATUS_VALUES = ['PROCESSING', 'COMPLETED'] as const;

export class UpdateComplaintStatusDto {
  @ApiProperty({
    description: '目标状态（PENDING→PROCESSING→COMPLETED，单向不可逆）',
    enum: COMPLAINT_STATUS_VALUES,
    example: 'PROCESSING',
  })
  @IsEnum(COMPLAINT_STATUS_VALUES)
  status!: typeof COMPLAINT_STATUS_VALUES[number];

  @ApiProperty({ description: '操作人姓名', example: '张管理员' })
  @IsString()
  @MaxLength(32)
  operatorName!: string;

  @ApiPropertyOptional({ description: '处理备注', example: '已联系居民协商处理' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}
