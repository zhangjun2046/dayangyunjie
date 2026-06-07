import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ description: '居民 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  residentId!: number;

  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString()
  @MaxLength(64)
  name!: string;

  @ApiProperty({ description: '联系人手机号', example: '13800138000' })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ description: '省', example: '北京市' })
  @IsString()
  @MaxLength(32)
  province!: string;

  @ApiProperty({ description: '市', example: '北京市' })
  @IsString()
  @MaxLength(32)
  city!: string;

  @ApiProperty({ description: '区', example: '朝阳区' })
  @IsString()
  @MaxLength(32)
  district!: string;

  @ApiProperty({ description: '详细地址', example: '建国路 88 号 2 单元 1201' })
  @IsString()
  @MaxLength(256)
  detail!: string;

  @ApiPropertyOptional({ description: '纬度', example: 39.9042 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: '经度', example: 116.4074 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ description: '是否默认地址', example: false, default: false })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
