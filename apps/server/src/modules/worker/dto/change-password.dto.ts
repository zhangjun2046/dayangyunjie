import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码（旧密码）', example: 'oldPassword123' })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({ description: '新密码（至少 6 位）', example: 'newPassword456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
