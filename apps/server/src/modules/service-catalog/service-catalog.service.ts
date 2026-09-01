import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceCatalogDto } from '@dayangyunjie/shared';
import { Prisma, ServiceCatalog } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateServiceCatalogDto } from './dto/create-service-catalog.dto';
import { QueryServiceCatalogDto } from './dto/query-service-catalog.dto';
import { UpdateServiceCatalogDto } from './dto/update-service-catalog.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: QueryServiceCatalogDto) {
    const { page = 1, pageSize = 10, bizType, isEnabled, name } = query;
    const where: Prisma.ServiceCatalogWhereInput = {
      ...(isEnabled !== undefined ? { isEnabled } : {}),
      ...(bizType ? { bizType } : {}),
      ...(name ? { name: { contains: name } } : {}),
    };

    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.serviceCatalog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prismaService.serviceCatalog.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const row = await this.prismaService.serviceCatalog.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`ServiceCatalog ${id} not found`);
    }
    return this.toDto(row);
  }

  async create(dto: CreateServiceCatalogDto) {
    const row = await this.prismaService.serviceCatalog.create({
      data: {
        bizType: dto.bizType,
        name: dto.name,
        subtitle: dto.subtitle,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.toDto(row);
  }

  async update(id: number, dto: UpdateServiceCatalogDto) {
    await this.assertExists(id);
    const row = await this.prismaService.serviceCatalog.update({
      where: { id },
      data: {
        ...(dto.bizType !== undefined ? { bizType: dto.bizType } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return this.toDto(row);
  }

  async remove(id: number) {
    await this.assertExists(id);
    const itemCount = await this.prismaService.recyclingItem.count({ where: { catalogId: id } });
    if (itemCount > 0) {
      throw new BadRequestException('请先删除该分类下的回收品项');
    }
    await this.prismaService.serviceCatalog.delete({ where: { id } });
    return { id };
  }

  async toggle(id: number) {
    const row = await this.prismaService.serviceCatalog.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`ServiceCatalog ${id} not found`);
    }
    const updated = await this.prismaService.serviceCatalog.update({
      where: { id },
      data: { isEnabled: !row.isEnabled },
    });
    return this.toDto(updated);
  }

  private async assertExists(id: number): Promise<void> {
    const count = await this.prismaService.serviceCatalog.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`ServiceCatalog ${id} not found`);
    }
  }

  private toDto(row: ServiceCatalog): ServiceCatalogDto {
    return {
      id: row.id,
      bizType: row.bizType as ServiceCatalogDto['bizType'],
      name: row.name,
      subtitle: row.subtitle ?? null,
      icon: row.icon ?? null,
      sortOrder: row.sortOrder,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
