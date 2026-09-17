import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class BindWechatDto {
  @ApiProperty({
    description: '员工端小程序 wx.login / uni.login 返回的 code',
    example: '081xxxxx',
  })
  @IsString()
  @Length(1, 128)
  code!: string;
}
