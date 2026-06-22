import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@dayunyunjie.com', description: '管理员邮箱' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'admin123', description: '登录密码' })
  @IsString()
  @MinLength(1, { message: '密码不能为空' })
  password!: string;
}
