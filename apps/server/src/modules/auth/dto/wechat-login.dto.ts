import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class WechatLoginDto {
  @ApiProperty({
    description: '微信登录 code（mock 模式下可传任意字符串）',
    example: 'wx_code_123456',
  })
  @IsString()
  @Length(1, 128)
  code!: string;

  @ApiPropertyOptional({
    description: '居民昵称（首次登录可选）',
    example: '张三',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiPropertyOptional({
    description: '居民头像 URL（首次登录可选）',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatar?: string;
}
