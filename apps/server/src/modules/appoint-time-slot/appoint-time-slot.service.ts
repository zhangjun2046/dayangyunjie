import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AppointTimeLeadDto, AppointTimeSlotConfigDto } from '@dayangyunjie/shared';
import {
  APPOINT_TIME_SLOT_FORMAT_MESSAGE,
  DEFAULT_APPOINT_LEAD_MINUTES,
  formatAppointTooSoonMessage,
  isAppointTooSoon,
  isAppointTimeSlotLabel,
  isValidAppointLeadMinutes,
} from '@dayangyunjie/shared';
import { AppointTimeSlotConfig, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAppointTimeSlotConfigDto } from './dto/create-appoint-time-slot.dto';
import { QueryAppointTimeSlotConfigDto } from './dto/query-appoint-time-slot.dto';
import { UpdateAppointTimeLeadDto } from './dto/update-appoint-time-lead.dto';
import { UpdateAppointTimeSlotConfigDto } from './dto/update-appoint-time-slot.dto';

@Injectable()
export class AppointTimeSlotService {
  constructor(private readonly prismaService: PrismaService) {}

  /** 公开读取某业务已启用时段，按 HH:mm 文案升序返回。 */
  async findEnabled(bizType: AppointTimeSlotConfigDto['bizType']): Promise<AppointTimeSlotConfigDto[]> {
    const rows = await this.prismaService.appointTimeSlotConfig.findMany({
      where: { bizType, isEnabled: true },
      orderBy: [{ label: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async findAll(query: QueryAppointTimeSlotConfigDto) {
    const { page = 1, pageSize = 10, bizType, label, isEnabled } = query;
    const normalizedLabel = label?.trim();
    const where: Prisma.AppointTimeSlotConfigWhereInput = {
      ...(bizType ? { bizType } : {}),
      ...(normalizedLabel ? { label: { contains: normalizedLabel } } : {}),
      ...(isEnabled !== undefined ? { isEnabled } : {}),
    };
    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.appointTimeSlotConfig.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ label: 'asc' }, { id: 'asc' }],
      }),
      this.prismaService.appointTimeSlotConfig.count({ where }),
    ]);
    return { items: rows.map((row) => this.toDto(row)), total, page, pageSize };
  }

  async create(dto: CreateAppointTimeSlotConfigDto): Promise<AppointTimeSlotConfigDto> {
    const label = this.normalizeLabel(dto.label);
    try {
      const row = await this.prismaService.appointTimeSlotConfig.create({
        data: {
          bizType: dto.bizType,
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

  async update(
    id: number,
    dto: UpdateAppointTimeSlotConfigDto,
  ): Promise<AppointTimeSlotConfigDto> {
    try {
      const row = await this.prismaService.appointTimeSlotConfig.update({
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

  async toggle(id: number): Promise<AppointTimeSlotConfigDto> {
    const current = await this.prismaService.appointTimeSlotConfig.findUnique({ where: { id } });
    if (!current) {
      throw this.notFound(id);
    }
    const row = await this.prismaService.appointTimeSlotConfig.update({
      where: { id },
      data: { isEnabled: !current.isEnabled },
    });
    return this.toDto(row);
  }

  async remove(id: number): Promise<{ id: number }> {
    try {
      await this.prismaService.appointTimeSlotConfig.delete({ where: { id } });
      return { id };
    } catch (error) {
      this.handleNotFound(error, id);
      throw error;
    }
  }

  async getLeadMinutes(bizType: AppointTimeSlotConfigDto['bizType']): Promise<number> {
    const row = await this.prismaService.appointTimeLeadConfig.findUnique({
      where: { bizType },
    });
    if (!row || !isValidAppointLeadMinutes(row.leadMinutes)) {
      return DEFAULT_APPOINT_LEAD_MINUTES;
    }
    return row.leadMinutes;
  }

  async getLeads(): Promise<AppointTimeLeadDto> {
    const [cleaningLeadMinutes, recyclingLeadMinutes] = await Promise.all([
      this.getLeadMinutes('CLEANING'),
      this.getLeadMinutes('RECYCLING'),
    ]);
    return { cleaningLeadMinutes, recyclingLeadMinutes };
  }

  async updateLeads(dto: UpdateAppointTimeLeadDto): Promise<AppointTimeLeadDto> {
    await this.prismaService.$transaction([
      this.prismaService.appointTimeLeadConfig.upsert({
        where: { bizType: 'CLEANING' },
        update: { leadMinutes: dto.cleaningLeadMinutes },
        create: { bizType: 'CLEANING', leadMinutes: dto.cleaningLeadMinutes },
      }),
      this.prismaService.appointTimeLeadConfig.upsert({
        where: { bizType: 'RECYCLING' },
        update: { leadMinutes: dto.recyclingLeadMinutes },
        create: { bizType: 'RECYCLING', leadMinutes: dto.recyclingLeadMinutes },
      }),
    ]);
    return this.getLeads();
  }

  async assertAppointNotTooSoon(
    bizType: AppointTimeSlotConfigDto['bizType'],
    appointDate: string,
    appointTimeSlot: string,
  ): Promise<void> {
    const leadMinutes = await this.getLeadMinutes(bizType);
    if (isAppointTooSoon(appointDate, appointTimeSlot, leadMinutes)) {
      throw new BadRequestException(formatAppointTooSoonMessage(leadMinutes));
    }
  }

  private normalizeLabel(label: string): string {
    const normalized = label.trim();
    if (!isAppointTimeSlotLabel(normalized)) {
      throw new BadRequestException(APPOINT_TIME_SLOT_FORMAT_MESSAGE);
    }
    return normalized;
  }

  private handleUniqueConflict(error: unknown): void {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictException('该业务下已存在相同预约时段');
    }
  }

  private handleNotFound(error: unknown, id: number): void {
    if ((error as { code?: string }).code === 'P2025') {
      throw this.notFound(id);
    }
  }

  private notFound(id: number): NotFoundException {
    return new NotFoundException(`预约时段配置（ID: ${id}）不存在`);
  }

  private toDto(row: AppointTimeSlotConfig): AppointTimeSlotConfigDto {
    return {
      id: row.id,
      bizType: row.bizType as AppointTimeSlotConfigDto['bizType'],
      label: row.label,
      sortOrder: row.sortOrder,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
