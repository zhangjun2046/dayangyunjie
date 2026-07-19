import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/** 用户名与密码不允许通过编辑表单修改，故不复用 PartialType(CreateAdminDto) */
export class UpdateAdminDto {
  @ApiPropertyOptional({ description: '管理员姓名', example: '系统管理员' })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  name?: string;

  @ApiPropertyOptional({ description: '管理员邮箱', example: 'admin2@dayunyunjie.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
