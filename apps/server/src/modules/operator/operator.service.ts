import { Injectable, NotFoundException } from '@nestjs/common';
import { OperatorDto } from '@dayangyunjie/shared';
import { Operator, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { QueryOperatorDto } from './dto/query-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';

@Injectable()
export class OperatorService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: QueryOperatorDto) {
    const { page = 1, pageSize = 10, purpose, name, phone, keyword } = query;
    const where: Prisma.OperatorWhereInput = {
      ...(purpose !== undefined ? { purpose: { contains: purpose } } : {}),
      ...(name !== undefined ? { name: { contains: name } } : {}),
      ...(phone !== undefined ? { phone: { contains: phone } } : {}),
      ...(keyword
        ? {
            OR: [{ name: { contains: keyword } }, { phone: { contains: keyword } }],
          }
        : {}),
    };

    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.operator.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      this.prismaService.operator.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  /** 返回用途为「接单」的第一条记录，供居民端首页客服电话动态获取 */
  async findContact() {
    const row = await this.prismaService.operator.findFirst({
      where: { purpose: '接单' },
      orderBy: { id: 'asc' },
    });
    return row ? this.toDto(row) : null;
  }

  async findOne(id: number) {
    const row = await this.prismaService.operator.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Operator ${id} not found`);
    }
    return this.toDto(row);
  }

  async create(dto: CreateOperatorDto) {
    const row = await this.prismaService.operator.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        purpose: dto.purpose ?? '接单',
      },
    });
    return this.toDto(row);
  }

  async update(id: number, dto: UpdateOperatorDto) {
    await this.assertExists(id);
    const row = await this.prismaService.operator.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.purpose !== undefined ? { purpose: dto.purpose } : {}),
      },
    });
    return this.toDto(row);
  }

  async remove(id: number) {
    await this.assertExists(id);
    await this.prismaService.operator.delete({ where: { id } });
    return { id };
  }

  private async assertExists(id: number): Promise<void> {
    const count = await this.prismaService.operator.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`Operator ${id} not found`);
    }
  }

  private toDto(row: Operator): OperatorDto {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      purpose: row.purpose,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
