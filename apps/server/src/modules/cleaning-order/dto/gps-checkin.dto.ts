import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

/** POST /cleaning-orders/:id/gps-checkin 请求体 — 员工 GPS 签到 */
export class GpsCheckinDto {
  @ApiProperty({ description: '签到纬度', example: 39.9042 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ description: '签到经度', example: 116.4074 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  /** 操作人固定为员工，此处传员工 ID */
  @ApiProperty({ description: '操作人 ID（员工）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;
}
