import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ComplaintReasonConfigDto } from '@dayangyunjie/shared';
import { ComplaintReasonConfig, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateComplaintReasonConfigDto } from './dto/create-complaint-reason-config.dto';
import { QueryComplaintReasonConfigDto } from './dto/query-complaint-reason-config.dto';
import { UpdateComplaintReasonConfigDto } from './dto/update-complaint-reason-config.dto';

@Injectable()
export class ComplaintReasonConfigService {
  constructor(private readonly prismaService: PrismaService) {}

  /** 居民端公开读取，仅返回当前启用项。 */
  async findEnabled(): Promise<ComplaintReasonConfigDto[]> {
    const rows = await this.prismaService.complaintReasonConfig.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  /** 管理端分页查询，可查看启用和停用项。 */
  async findAll(query: QueryComplaintReasonConfigDto) {
    const { page = 1, pageSize = 10, id, label, isEnabled } = query;
    const normalizedLabel = label?.trim();
    const where: Prisma.ComplaintReasonConfigWhereInput = {
      ...(id !== undefined ? { id } : {}),
      ...(normalizedLabel ? { label: { contains: normalizedLabel } } : {}),
      ...(isEnabled !== undefined ? { isEnabled } : {}),
    };
    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.complaintReasonConfig.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prismaService.complaintReasonConfig.count({ where }),
    ]);
    return { items: rows.map((row) => this.toDto(row)), total, page, pageSize };
  }

  /** 新增投诉原因配置。 */
  async create(dto: CreateComplaintReasonConfigDto): Promise<ComplaintReasonConfigDto> {
    const label = this.normalizeLabel(dto.label);
    try {
      const row = await this.prismaService.complaintReasonConfig.create({
        data: {
          label,
          sortOrder: dto.sortOrder ?? 0,
          isEnabled: dto.isEnabled ?? true,
        },
      });
      return this.toDto(row);
    } catch (error) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  /** 按主键查询配置。 */
  async findOne(id: number): Promise<ComplaintReasonConfigDto> {
    const row = await this.prismaService.complaintReasonConfig.findUnique({ where: { id } });
    if (!row) {
      throw this.notFound(id);
    }
    return this.toDto(row);
  }

  /** 仅允许修改展示文案和排序值。 */
  async update(
    id: number,
    dto: UpdateComplaintReasonConfigDto,
  ): Promise<ComplaintReasonConfigDto> {
    try {
      const row = await this.prismaService.complaintReasonConfig.update({
        where: { id },
        data: {
          ...(dto.label !== undefined ? { label: this.normalizeLabel(dto.label) } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
      return this.toDto(row);
    } catch (error) {
      this.handleUniqueConflict(error);
      this.handleNotFound(error, id);
      throw error;
    }
  }

  /**
   * 使用当前状态作为条件执行 CAS 更新。
   * 并发请求读取到相同状态时，失败方会读取最新状态并重试，确保每次调用都完成一次切换。
   */
  async toggle(id: number): Promise<ComplaintReasonConfigDto> {
    while (true) {
      const current = await this.prismaService.complaintReasonConfig.findUnique({ where: { id } });
      if (!current) {
        throw this.notFound(id);
      }

      const result = await this.prismaService.complaintReasonConfig.updateMany({
        where: { id, isEnabled: current.isEnabled },
        data: { isEnabled: !current.isEnabled },
      });
      if (result.count === 0) {
        continue;
      }

      const row = await this.prismaService.complaintReasonConfig.findUnique({ where: { id } });
      if (!row) {
        throw this.notFound(id);
      }
      return this.toDto(row);
    }
  }

  /** 硬删除配置；数据库外键会将历史投诉关联置空，快照文案不受影响。 */
  async remove(id: number): Promise<{ id: number }> {
    try {
      await this.prismaService.complaintReasonConfig.delete({ where: { id } });
      return { id };
    } catch (error) {
      this.handleNotFound(error, id);
      throw error;
    }
  }

  private normalizeLabel(label: string): string {
    const normalized = label.trim();
    if (!normalized || normalized.length > 32) {
      throw new BadRequestException('投诉原因展示文案长度必须为 1-32 个字符');
    }
    return normalized;
  }

  private handleUniqueConflict(error: unknown): void {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictException('已存在相同投诉原因');
    }
  }

  private handleNotFound(error: unknown, id: number): void {
    if ((error as { code?: string }).code === 'P2025') {
      throw this.notFound(id);
    }
  }

  private notFound(id: number): NotFoundException {
    return new NotFoundException(`投诉原因配置（ID: ${id}）不存在`);
  }

  private toDto(row: ComplaintReasonConfig): ComplaintReasonConfigDto {
    return {
      id: row.id,
      label: row.label,
      sortOrder: row.sortOrder,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
