import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ConsultStatus } from '@prisma/client';

/** 合法的目标状态枚举（排除 FOLLOW_UP，因为创建时已默认为 FOLLOW_UP） */
const ALLOWED_TARGET_STATUSES = [ConsultStatus.FOLLOWING, ConsultStatus.COMPLETED] as const;

export class UpdateConsultStatusDto {
  @ApiProperty({
    description: '目标状态（FOLLOWING=跟进中，COMPLETED=已完成）',
    enum: ALLOWED_TARGET_STATUSES,
    example: ConsultStatus.FOLLOWING,
  })
  @IsEnum(ALLOWED_TARGET_STATUSES, {
    message: `status 必须是以下值之一：${ALLOWED_TARGET_STATUSES.join(', ')}`,
  })
  status!: (typeof ALLOWED_TARGET_STATUSES)[number];

  @ApiProperty({ description: '操作人 ID（管理员 ID）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;

  @ApiProperty({ description: '备注（跟进说明等）', example: '已电话联系客户，安排阿姨周五上门', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}
