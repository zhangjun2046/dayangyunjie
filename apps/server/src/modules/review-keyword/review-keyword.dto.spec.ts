import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReviewKeywordDto } from './dto/create-review-keyword.dto';
import { QueryReviewKeywordDto } from './dto/query-review-keyword.dto';
import { UpdateReviewKeywordDto } from './dto/update-review-keyword.dto';

async function errorProperties<T extends object>(type: new () => T, payload: object): Promise<string[]> {
  const errors = await validate(plainToInstance(type, payload));
  return errors.map((error) => error.property);
}

describe('ReviewKeyword DTO validation', () => {
  describe('CreateReviewKeywordDto', () => {
    it.each(['CLEANING', 'RECYCLING'])('接受业务类型 %s', async (bizType) => {
      await expect(
        errorProperties(CreateReviewKeywordDto, { bizType, keyword: '准时到达', sortOrder: 0 }),
      ).resolves.toEqual([]);
    });

    it('拒绝不支持的业务类型', async () => {
      expect(
        await errorProperties(CreateReviewKeywordDto, { bizType: 'CONSULT', keyword: '态度好' }),
      ).toContain('bizType');
    });

    it.each([
      ['', 'keyword'],
      ['x'.repeat(33), 'keyword'],
    ])('拒绝非法关键词 %#', async (keyword, property) => {
      expect(await errorProperties(CreateReviewKeywordDto, { bizType: 'CLEANING', keyword })).toContain(
        property,
      );
    });

    it.each([-1, 1.5])('拒绝非法排序值 %s', async (sortOrder) => {
      expect(
        await errorProperties(CreateReviewKeywordDto, {
          bizType: 'CLEANING',
          keyword: '态度好',
          sortOrder,
        }),
      ).toContain('sortOrder');
    });
  });

  describe('UpdateReviewKeywordDto', () => {
    it('允许空更新对象', async () => {
      await expect(errorProperties(UpdateReviewKeywordDto, {})).resolves.toEqual([]);
    });

    it('校验提供的可选字段', async () => {
      const properties = await errorProperties(UpdateReviewKeywordDto, {
        bizType: 'CONSULT',
        keyword: '',
        sortOrder: -1,
      });
      expect(properties).toEqual(expect.arrayContaining(['bizType', 'keyword', 'sortOrder']));
    });
  });

  describe('QueryReviewKeywordDto', () => {
    it.each([
      ['true', true],
      ['false', false],
    ])('正确转换 isEnabled=%s', async (input, expected) => {
      const dto = plainToInstance(
        QueryReviewKeywordDto,
        { isEnabled: input },
        { enableImplicitConversion: true },
      );
      expect(dto.isEnabled).toBe(expected);
      await expect(validate(dto)).resolves.toEqual([]);
    });

    it('开启全局隐式转换时仍拒绝非法布尔值', async () => {
      const dto = plainToInstance(
        QueryReviewKeywordDto,
        { isEnabled: 'invalid' },
        { enableImplicitConversion: true },
      );
      expect(await validate(dto)).toEqual([
        expect.objectContaining({ property: 'isEnabled' }),
      ]);
    });

    it('将分页参数转换为数字', async () => {
      const dto = plainToInstance(QueryReviewKeywordDto, { page: '2', pageSize: '50' });
      expect(dto.page).toBe(2);
      expect(dto.pageSize).toBe(50);
      await expect(validate(dto)).resolves.toEqual([]);
    });

    it.each([
      [{ page: 0 }, 'page'],
      [{ pageSize: 101 }, 'pageSize'],
      [{ bizType: 'CONSULT' }, 'bizType'],
      [{ keyword: 'x'.repeat(33) }, 'keyword'],
      [{ isEnabled: 'invalid' }, 'isEnabled'],
    ])('拒绝非法查询参数 %#', async (payload, property) => {
      expect(await errorProperties(QueryReviewKeywordDto, payload)).toContain(property);
    });
  });
});
