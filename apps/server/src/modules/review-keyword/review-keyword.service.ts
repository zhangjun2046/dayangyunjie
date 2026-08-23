import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReviewKeywordDto } from '@dayangyunjie/shared';
import { Prisma, ReviewKeyword } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReviewKeywordDto } from './dto/create-review-keyword.dto';
import { QueryReviewKeywordDto } from './dto/query-review-keyword.dto';
import { UpdateReviewKeywordDto } from './dto/update-review-keyword.dto';

@Injectable()
export class ReviewKeywordService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: QueryReviewKeywordDto) {
    const { page = 1, pageSize = 10, bizType, keyword, isEnabled } = query;
    const where: Prisma.ReviewKeywordWhereInput = {
      ...(bizType ? { bizType } : {}),
      ...(keyword ? { keyword: { contains: keyword.trim() } } : {}),
      ...(isEnabled !== undefined ? { isEnabled } : {}),
    };
    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.reviewKeyword.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prismaService.reviewKeyword.count({ where }),
    ]);
    return { items: rows.map((row) => this.toDto(row)), total, page, pageSize };
  }

  async findOne(id: number): Promise<ReviewKeywordDto> {
    const row = await this.prismaService.reviewKeyword.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`ReviewKeyword ${id} not found`);
    }
    return this.toDto(row);
  }

  async create(dto: CreateReviewKeywordDto): Promise<ReviewKeywordDto> {
    const keyword = this.normalizeKeyword(dto.keyword);
    try {
      const row = await this.prismaService.reviewKeyword.create({
        data: {
          bizType: dto.bizType,
          keyword,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      return this.toDto(row);
    } catch (error) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async update(id: number, dto: UpdateReviewKeywordDto): Promise<ReviewKeywordDto> {
    await this.assertExists(id);
    try {
      const row = await this.prismaService.reviewKeyword.update({
        where: { id },
        data: {
          ...(dto.bizType !== undefined ? { bizType: dto.bizType } : {}),
          ...(dto.keyword !== undefined ? { keyword: this.normalizeKeyword(dto.keyword) } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
      return this.toDto(row);
    } catch (error) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async remove(id: number): Promise<{ id: number }> {
    await this.assertExists(id);
    await this.prismaService.reviewKeyword.delete({ where: { id } });
    return { id };
  }

  async toggle(id: number): Promise<ReviewKeywordDto> {
    const current = await this.prismaService.reviewKeyword.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`ReviewKeyword ${id} not found`);
    }
    const row = await this.prismaService.reviewKeyword.update({
      where: { id },
      data: { isEnabled: !current.isEnabled },
    });
    return this.toDto(row);
  }

  private normalizeKeyword(keyword: string): string {
    const normalized = keyword.trim();
    if (!normalized) {
      throw new BadRequestException('评价关键词不能为空');
    }
    return normalized;
  }

  private async assertExists(id: number): Promise<void> {
    const count = await this.prismaService.reviewKeyword.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`ReviewKeyword ${id} not found`);
    }
  }

  private handleUniqueConflict(error: unknown): void {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictException('该业务类型下已存在相同评价关键词');
    }
  }

  private toDto(row: ReviewKeyword): ReviewKeywordDto {
    return {
      id: row.id,
      bizType: row.bizType as ReviewKeywordDto['bizType'],
      keyword: row.keyword,
      sortOrder: row.sortOrder,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
