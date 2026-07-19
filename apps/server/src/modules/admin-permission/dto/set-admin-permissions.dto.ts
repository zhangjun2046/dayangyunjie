import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { ALL_MENU_KEYS } from '../constants/menu-keys.constant';

export class SetAdminPermissionsDto {
  @ApiProperty({
    description: '该用户可访问的功能节点 menuKey 清单（覆盖保存）',
    example: ['orders.cleaning', 'data.dashboard'],
    isArray: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_MENU_KEYS, { each: true })
  menuKeys!: string[];
}
