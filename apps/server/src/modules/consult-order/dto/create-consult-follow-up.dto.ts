import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

/** POST /consult-orders/:id/follow-ups 请求体 — 新增跟进记录 */
export class CreateConsultFollowUpDto {
  @ApiProperty({ description: '跟进人姓名', example: '客服小李' })
  @IsString()
  @MaxLength(32)
  handlerName!: string;

  @ApiProperty({ description: '跟进内容', example: '已与客户电话沟通，确认需求为每周两次保洁' })
  @IsString()
  @MaxLength(2000)
  content!: string;
}
