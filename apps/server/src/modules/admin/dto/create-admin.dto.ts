import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ description: '管理员邮箱', example: 'admin2@dayunyunjie.com' })
  @IsEmail()
  @MaxLength(128)
  email!: string;

  @ApiProperty({ description: '登录密码（明文，仅传输使用）', example: 'Admin@123' })
  @IsString()
  @Length(6, 128)
  password!: string;

  @ApiProperty({ description: '管理员姓名', example: '系统管理员' })
  @IsString()
  @Length(1, 32)
  name!: string;
}
