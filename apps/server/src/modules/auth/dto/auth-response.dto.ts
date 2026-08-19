import { ApiProperty } from '@nestjs/swagger';

class TokenDataDto {
  @ApiProperty({ description: '访问令牌' })
  accessToken!: string;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken!: string;

  @ApiProperty({ description: '访问令牌过期时间（秒）', example: 7200 })
  expiresIn!: number;
}

class ResidentProfileDto {
  @ApiProperty({ description: '居民 ID', example: 1 })
  id!: number;

  @ApiProperty({ description: '居民 openid', example: 'oXXXX' })
  openid!: string;

  @ApiProperty({ description: '居民昵称', required: false, nullable: true })
  nickname!: string | null;

  @ApiProperty({ description: '居民头像', required: false, nullable: true })
  avatar!: string | null;

  @ApiProperty({ description: '绑定手机号', required: false, nullable: true })
  phone!: string | null;
}

export class LoginResultDto {
  @ApiProperty({ type: TokenDataDto })
  tokens!: TokenDataDto;

  @ApiProperty({ type: ResidentProfileDto })
  resident!: ResidentProfileDto;
}

export class ApiResponseDto<TData> {
  @ApiProperty({ example: 0 })
  code!: number;

  @ApiProperty({ example: 'ok' })
  message!: string;

  data!: TData;
}
