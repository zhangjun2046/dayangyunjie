import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateFollowUpDto {
  @ApiProperty({ description: '处理人姓名', example: '张管理员' })
  @IsString()
  @MaxLength(32)
  handlerName!: string;

  @ApiProperty({ description: '跟进内容', example: '已联系居民，正在协商赔偿方案' })
  @IsString()
  @MaxLength(2000)
  content!: string;
}
