import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkerStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkerDto {
  @ApiProperty({ description: '员工微信 openid', example: 'wx_worker_openid_001' })
  @IsString()
  @Length(1, 64)
  openid!: string;

  @ApiProperty({ description: '员工工号', example: 'WK0001' })
  @IsString()
  @Length(1, 32)
  employeeNo!: string;

  @ApiProperty({ description: '登录密码（明文，仅传输使用）', example: 'Worker@123' })
  @IsString()
  @Length(6, 128)
  password!: string;

  @ApiProperty({ description: '姓名', example: '李师傅' })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ description: '手机号', example: '13900000000' })
  @IsString()
  @Length(1, 20)
  phone!: string;

  @ApiPropertyOptional({
    description: '头像 URL',
    example: 'https://example.com/worker-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatar?: string;

  @ApiPropertyOptional({ enum: WorkerStatus, description: '员工状态', default: WorkerStatus.IDLE })
  @IsOptional()
  @IsEnum(WorkerStatus)
  status?: WorkerStatus;

  @ApiPropertyOptional({ description: '评分', example: 5, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: '累计订单数', example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalOrders?: number;

  @ApiProperty({
    description: '技能标签列表',
    type: [String],
    example: ['日常保洁', '深度保洁'],
  })
  @IsArray()
  skills!: string[];
}
