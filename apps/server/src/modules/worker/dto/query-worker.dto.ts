import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkerEmploymentStatus, WorkerStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryWorkerDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional({ description: '按姓名模糊查询', example: '李' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '按手机号模糊查询', example: '139' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: WorkerStatus, description: '服务状态筛选（空闲/服务中）' })
  @IsOptional()
  @IsEnum(WorkerStatus)
  status?: WorkerStatus;

  @ApiPropertyOptional({ enum: WorkerEmploymentStatus, description: '在职状态筛选（在职/离职）' })
  @IsOptional()
  @IsEnum(WorkerEmploymentStatus)
  employmentStatus?: WorkerEmploymentStatus;

  @ApiPropertyOptional({ description: '技能筛选（CLEANING / RECYCLING）', example: 'CLEANING' })
  @IsOptional()
  @IsString()
  skillType?: string;
}
