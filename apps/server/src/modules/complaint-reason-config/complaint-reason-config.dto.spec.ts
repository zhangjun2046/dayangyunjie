import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateComplaintDto } from '../complaint/dto/create-complaint.dto';
import { CreateComplaintReasonConfigDto } from './dto/create-complaint-reason-config.dto';
import { QueryComplaintReasonConfigDto } from './dto/query-complaint-reason-config.dto';
import { UpdateComplaintReasonConfigDto } from './dto/update-complaint-reason-config.dto';

async function errorProperties<T extends object>(type: new () => T, payload: object): Promise<string[]> {
  return (await validate(plainToInstance(type, payload))).map((error) => error.property);
}

describe('ComplaintReasonConfig DTO validation', () => {
  it('查询支持 id/label/isEnabled 并转换参数', async () => {
    const dto = plainToInstance(QueryComplaintReasonConfigDto, {
      id: '2',
      label: '清洁',
      isEnabled: 'false',
      page: '2',
    });
    expect(dto).toMatchObject({ id: 2, label: '清洁', isEnabled: false, page: 2 });
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it.each([
    [{ id: 0 }, 'id'],
    [{ label: 'x'.repeat(33) }, 'label'],
    [{ isEnabled: 'invalid' }, 'isEnabled'],
  ])('拒绝非法查询参数 %#', async (payload, property) => {
    expect(await errorProperties(QueryComplaintReasonConfigDto, payload)).toContain(property);
  });

  it('接受合法创建与更新参数', async () => {
    await expect(
      validate(plainToInstance(CreateComplaintReasonConfigDto, {
        label: '服务态度差',
        sortOrder: 1,
        isEnabled: false,
      })),
    ).resolves.toEqual([]);
    await expect(
      validate(plainToInstance(UpdateComplaintReasonConfigDto, { label: '新文案' })),
    ).resolves.toEqual([]);
  });

  it.each([
    [{ label: '' }, 'label'],
    [{ label: 'x'.repeat(33) }, 'label'],
    [{ sortOrder: -1 }, 'sortOrder'],
    [{ isEnabled: 'false' }, 'isEnabled'],
  ])('拒绝非法创建参数 %#', async (payload, property) => {
    expect(await errorProperties(CreateComplaintReasonConfigDto, payload)).toContain(property);
  });

  it('投诉创建 DTO 要求至少一项正整数 reasonConfigIds', async () => {
    const valid = {
      orderType: 'CLEANING',
      orderId: 1,
      reasonConfigIds: [2, 5],
      description: '服务不符合预期',
    };
    await expect(validate(plainToInstance(CreateComplaintDto, valid))).resolves.toEqual([]);
    expect(
      await errorProperties(CreateComplaintDto, { ...valid, reasonConfigIds: [] }),
    ).toContain('reasonConfigIds');
    expect(
      await errorProperties(CreateComplaintDto, { ...valid, reasonConfigIds: [0] }),
    ).toContain('reasonConfigIds');
  });
});
