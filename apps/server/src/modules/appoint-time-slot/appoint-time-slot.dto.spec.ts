import { APPOINT_TIME_SLOT_FORMAT_MESSAGE } from '@dayangyunjie/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppointTimeSlotConfigDto } from './dto/create-appoint-time-slot.dto';
import { QueryAppointTimeSlotConfigDto } from './dto/query-appoint-time-slot.dto';
import { QueryEnabledAppointTimeSlotDto } from './dto/query-enabled-appoint-time-slot.dto';
import { UpdateAppointTimeSlotConfigDto } from './dto/update-appoint-time-slot.dto';

async function errorProperties<T extends object>(type: new () => T, payload: object): Promise<string[]> {
  const errors = await validate(plainToInstance(type, payload));
  return errors.map((error) => error.property);
}

describe('AppointTimeSlot DTO validation', () => {
  describe('CreateAppointTimeSlotConfigDto', () => {
    it.each(['CLEANING', 'RECYCLING'])('接受业务类型 %s 与合法 HH:mm', async (bizType) => {
      await expect(
        errorProperties(CreateAppointTimeSlotConfigDto, { bizType, label: '08:30', sortOrder: 0 }),
      ).resolves.toEqual([]);
    });

    it('拒绝不支持的业务类型', async () => {
      expect(
        await errorProperties(CreateAppointTimeSlotConfigDto, { bizType: 'CONSULT', label: '08:00' }),
      ).toContain('bizType');
    });

    it.each(['8:00', '08:0', '14:00-16:00', '下午两点', ''])('拒绝非法时段 %s', async (label) => {
      expect(
        await errorProperties(CreateAppointTimeSlotConfigDto, { bizType: 'CLEANING', label }),
      ).toContain('label');
    });
  });

  describe('UpdateAppointTimeSlotConfigDto', () => {
    it('允许空更新对象', async () => {
      await expect(errorProperties(UpdateAppointTimeSlotConfigDto, {})).resolves.toEqual([]);
    });

    it('拒绝非法 label', async () => {
      expect(await errorProperties(UpdateAppointTimeSlotConfigDto, { label: '8:00' })).toContain(
        'label',
      );
    });
  });

  describe('QueryEnabledAppointTimeSlotDto', () => {
    it('缺少 bizType 时失败', async () => {
      expect(await errorProperties(QueryEnabledAppointTimeSlotDto, {})).toContain('bizType');
    });
  });

  describe('QueryAppointTimeSlotConfigDto', () => {
    it.each([
      ['true', true],
      ['false', false],
    ])('正确转换 isEnabled=%s', async (input, expected) => {
      const dto = plainToInstance(
        QueryAppointTimeSlotConfigDto,
        { isEnabled: input },
        { enableImplicitConversion: true },
      );
      expect(dto.isEnabled).toBe(expected);
      await expect(validate(dto)).resolves.toEqual([]);
    });
  });
});

describe('AppointTimeSlot format message', () => {
  it('对外提示文案固定', () => {
    expect(APPOINT_TIME_SLOT_FORMAT_MESSAGE).toBe('时段格式须为 HH:mm，例如 08:00');
  });
});
