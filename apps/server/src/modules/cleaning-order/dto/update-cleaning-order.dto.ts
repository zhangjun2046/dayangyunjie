import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCleaningOrderDto {
  @ApiPropertyOptional({ description: '预约日期（ISO 日期）', example: '2026-06-08' })
  @IsOptional()
  @IsDateString()
  appointDate?: string;

  @ApiPropertyOptional({ description: '预约时段', example: '16:00-18:00' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appointTimeSlot?: string;

  @ApiPropertyOptional({ description: '联系人姓名', example: '李四' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactName?: string;

  @ApiPropertyOptional({ description: '联系人手机号', example: '13900139000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({ description: '备注', example: '请敲门后稍等' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}
