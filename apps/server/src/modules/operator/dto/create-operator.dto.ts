import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateOperatorDto {
  @ApiProperty({ description: '运营人员姓名', example: '张三' })
  @IsString()
  @MaxLength(32)
  name!: string;

  @ApiProperty({ description: '联系电话', example: '13800138000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @ApiPropertyOptional({ description: '用途（如：接单、咨询）', example: '接单', default: '接单' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  purpose?: string = '接单';
}
