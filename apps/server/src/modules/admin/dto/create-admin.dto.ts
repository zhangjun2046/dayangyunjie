import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ description: '用户名（唯一，创建后不可修改）', example: 'ops_zhang' })
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名仅支持字母、数字、下划线' })
  username!: string;

  @ApiProperty({ description: '管理员邮箱', example: 'admin2@dayunyunjie.com' })
  @IsEmail()
  @MaxLength(128)
  email!: string;

  @ApiProperty({ description: '管理员姓名', example: '系统管理员' })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
