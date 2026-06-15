import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WorkerLoginDto {
  @ApiProperty({ description: '员工手机号', example: '13800138001' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: '登录密码', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
