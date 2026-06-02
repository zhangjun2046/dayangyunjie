import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@server/common/prisma/prisma.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';

@Injectable()
export class ResidentService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createResidentDto: CreateResidentDto) {
    try {
      return await this.prismaService.resident.create({
        data: createResidentDto,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: QueryResidentDto) {
    const { page = 1, pageSize = 10, nickname, phone } = query;
    const where: Prisma.ResidentWhereInput = {
      ...(nickname ? { nickname: { contains: nickname } } : {}),
      ...(phone ? { phone: { contains: phone } } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.resident.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      this.prismaService.resident.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: number) {
    const resident = await this.prismaService.resident.findUnique({ where: { id } });
    if (!resident) {
      throw new NotFoundException(`Resident ${id} not found`);
    }
    return resident;
  }

  async update(id: number, updateResidentDto: UpdateResidentDto) {
    await this.findOne(id);
    try {
      return await this.prismaService.resident.update({
        where: { id },
        data: updateResidentDto,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prismaService.resident.delete({ where: { id } });
    return { id };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Resident unique field already exists');
    }
    throw error;
  }
}
