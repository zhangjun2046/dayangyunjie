import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAdminDto {
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

  @ApiPropertyOptional({ description: '按用户名模糊查询', example: 'zhang' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '按姓名模糊查询', example: '系统' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '按邮箱模糊查询', example: '@dayunyunjie.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: '按手机号模糊查询', example: '138' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '用户名/姓名/手机号/邮箱模糊搜索', example: '张' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
