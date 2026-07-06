import { Injectable, NotFoundException } from '@nestjs/common';
import { BannerDto } from '@dayangyunjie/shared';
import { Banner, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { QueryActiveBannerDto } from './dto/query-active-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannerService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: QueryBannerDto) {
    const { page = 1, pageSize = 10, displayTarget, isEnabled, title } = query;
    const where: Prisma.BannerWhereInput = {
      ...(displayTarget !== undefined ? { displayTarget } : {}),
      ...(isEnabled !== undefined ? { isEnabled } : {}),
      ...(title !== undefined && title !== '' ? { title: { contains: title } } : {}),
    };

    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.banner.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prismaService.banner.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  /** 查询当前有效轮播图：isEnabled=true 且当前时间在 startTime~endTime 范围内 */
  async findActive(query: QueryActiveBannerDto) {
    const now = new Date();
    const where: Prisma.BannerWhereInput = {
      isEnabled: true,
      startTime: { lte: now },
      endTime: { gte: now },
      ...(query.displayTarget !== undefined ? { displayTarget: query.displayTarget } : {}),
    };

    const rows = await this.prismaService.banner.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: number) {
    const row = await this.prismaService.banner.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Banner ${id} not found`);
    }
    return this.toDto(row);
  }

  async create(dto: CreateBannerDto) {
    const row = await this.prismaService.banner.create({
      data: {
        imageUrl: dto.imageUrl,
        title: dto.title,
        displayTarget: dto.displayTarget ?? 'RESIDENT',
        linkType: dto.linkType ?? 'NONE',
        linkTarget: dto.linkTarget,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        sortOrder: dto.sortOrder ?? 0,
        isEnabled: dto.isEnabled ?? true,
      },
    });
    return this.toDto(row);
  }

  async update(id: number, dto: UpdateBannerDto) {
    await this.assertExists(id);
    const row = await this.prismaService.banner.update({
      where: { id },
      data: {
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.displayTarget !== undefined ? { displayTarget: dto.displayTarget } : {}),
        ...(dto.linkType !== undefined ? { linkType: dto.linkType } : {}),
        ...(dto.linkTarget !== undefined ? { linkTarget: dto.linkTarget } : {}),
        ...(dto.startTime !== undefined ? { startTime: new Date(dto.startTime) } : {}),
        ...(dto.endTime !== undefined ? { endTime: new Date(dto.endTime) } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
      },
    });
    return this.toDto(row);
  }

  async remove(id: number) {
    await this.assertExists(id);
    await this.prismaService.banner.delete({ where: { id } });
    return { id };
  }

  private async assertExists(id: number): Promise<void> {
    const count = await this.prismaService.banner.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`Banner ${id} not found`);
    }
  }

  private toDto(row: Banner): BannerDto {
    return {
      id: row.id,
      imageUrl: row.imageUrl,
      title: row.title ?? null,
      displayTarget: row.displayTarget as BannerDto['displayTarget'],
      linkType: row.linkType as BannerDto['linkType'],
      linkTarget: row.linkTarget ?? null,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      sortOrder: row.sortOrder,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
