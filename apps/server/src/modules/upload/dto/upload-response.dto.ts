import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
  @ApiProperty({ description: '图片访问 URL', example: 'http://localhost:3000/uploads/CLN20260608_1749376800000_abc123.jpg' })
  url!: string;

  @ApiProperty({ description: '存储文件名', example: 'CLN20260608_1749376800000_abc123.jpg' })
  filename!: string;
}
