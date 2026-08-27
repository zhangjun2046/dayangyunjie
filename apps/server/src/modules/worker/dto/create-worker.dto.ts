import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkerEmploymentStatus, WorkerStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkerDto {
  @ApiProperty({ description: '员工工号（系统自动生成或手工录入）', example: 'WK0001' })
  @IsString()
  @Length(1, 32)
  employeeNo!: string;

  @ApiProperty({ description: '登录密码（明文，仅传输使用；默认建议用完整手机号）', example: 'Worker@123' })
  @IsString()
  @Length(6, 128)
  password!: string;

  @ApiProperty({ description: '姓名', example: '李师傅' })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ description: '手机号（登录账号，UNIQUE）', example: '13900000000' })
  @IsString()
  @Length(1, 20)
  phone!: string;

  @ApiProperty({
    description: '技能单选（v2.0：CLEANING=保洁，RECYCLING=收废品）',
    example: 'CLEANING',
    enum: ['CLEANING', 'RECYCLING'],
  })
  @IsString()
  @Length(1, 16)
  skillType!: string;

  @ApiPropertyOptional({ description: '昵称', example: '李姐' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string;

  @ApiPropertyOptional({ description: '性别（MALE / FEMALE）', example: 'MALE', enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsString()
  @Length(1, 8)
  gender?: string;

  @ApiPropertyOptional({ description: '岗位（CLEANER / RECYCLER）', example: 'CLEANER', enum: ['CLEANER', 'RECYCLER'] })
  @IsOptional()
  @IsString()
  @Length(1, 16)
  position?: string;

  @ApiPropertyOptional({
    description: '头像 URL',
    example: 'https://example.com/worker-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatar?: string;

  @ApiPropertyOptional({ enum: WorkerStatus, description: '服务状态（空闲/服务中）', default: WorkerStatus.IDLE })
  @IsOptional()
  @IsEnum(WorkerStatus)
  status?: WorkerStatus;

  @ApiPropertyOptional({
    enum: WorkerEmploymentStatus,
    description: '在职状态（在职/离职）',
    default: WorkerEmploymentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(WorkerEmploymentStatus)
  employmentStatus?: WorkerEmploymentStatus;

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

  @ApiPropertyOptional({ description: '身份证号', example: '110101199001011234' })
  @IsOptional()
  @IsString()
  @MaxLength(18)
  idCard?: string;

  @ApiPropertyOptional({ description: '紧急联系人姓名', example: '张三' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  emergencyContact?: string;

  @ApiPropertyOptional({ description: '紧急联系人电话', example: '13900000001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyPhone?: string;

  @ApiPropertyOptional({ description: '健康证图片 URL', example: 'https://example.com/health.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  healthCertUrl?: string;

  @ApiPropertyOptional({ description: '健康证有效期（ISO 日期字符串）', example: '2027-01-01' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  healthCertExpiry?: string;

  @ApiPropertyOptional({ description: '技能证书图片 URL', example: 'https://example.com/skill.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  skillCertUrl?: string;

  @ApiPropertyOptional({
    description: '技能证书图片 URL 列表，最多 9 张',
    example: [
      'https://example.com/skill-1.jpg',
      'https://example.com/skill-2.jpg',
    ],
    type: [String],
    maxItems: 9,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  @IsUrl({ require_protocol: true, require_tld: false }, { each: true })
  skillCertUrls?: string[];

  @ApiPropertyOptional({ description: '技能证书有效期（ISO 日期字符串）', example: '2027-01-01' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  skillCertExpiry?: string;
}
