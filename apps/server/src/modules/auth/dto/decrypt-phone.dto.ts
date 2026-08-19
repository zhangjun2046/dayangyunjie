import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class DecryptPhoneDto {
  @ApiProperty({
    description:
      'getPhoneNumber 回调返回的一次性 code（已配置微信凭证时由微信校验；未配置时任意非空字符串均可 mock）',
    example: 'phone_code_abc123',
  })
  @IsString()
  @Length(1, 256)
  code!: string;
}
