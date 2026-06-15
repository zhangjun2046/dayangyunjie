import { Injectable, NotFoundException } from '@nestjs/common';
import { ServiceCatalogDto } from '@dayangyunjie/shared';
import { Prisma, ServiceCatalog } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryServiceCatalogDto } from './dto/query-service-catalog.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: QueryServiceCatalogDto) {
    const { page = 1, pageSize = 10, bizType, isEnabled = true } = query;
    const where: Prisma.ServiceCatalogWhereInput = {
      isEnabled,
      ...(bizType ? { bizType } : {}),
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
