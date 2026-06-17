import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class DecryptPhoneDto {
  @ApiProperty({
    description: 'getPhoneNumber 回调返回的一次性 code（mock 模式接受任意字符串）',
    example: 'phone_code_abc123',
  })
  @IsString()
  @Length(1, 256)
  code!: string;
}
