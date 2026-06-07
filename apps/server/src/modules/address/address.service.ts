import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { QueryAddressDto } from './dto/query-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createAddressDto: CreateAddressDto) {
    await this.ensureResidentExists(createAddressDto.residentId);

    const data = await this.prismaService.$transaction(async (tx) => {
      if (createAddressDto.isDefault) {
        await tx.address.updateMany({
          where: { residentId: createAddressDto.residentId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({ data: createAddressDto });
    });

    return data;
  }

  async findAll(query: QueryAddressDto) {
    const { page = 1, pageSize = 10, residentId, isDefault } = query;
    const where: Prisma.AddressWhereInput = {
      ...(typeof residentId === 'number' ? { residentId } : {}),
      ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.address.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      this.prismaService.address.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: number) {
    const address = await this.prismaService.address.findUnique({ where: { id } });
    if (!address) {
      throw new NotFoundException(`Address ${id} not found`);
    }
    return address;
  }

  async update(id: number, updateAddressDto: UpdateAddressDto) {
    const current = await this.findOne(id);

    const targetResidentId = updateAddressDto.residentId ?? current.residentId;
    await this.ensureResidentExists(targetResidentId);

    const data = await this.prismaService.$transaction(async (tx) => {
      if (updateAddressDto.isDefault === true) {
        await tx.address.updateMany({
          where: { residentId: targetResidentId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: updateAddressDto,
      });
    });

    return data;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prismaService.address.delete({ where: { id } });
    return { id };
  }

  async setDefault(id: number) {
    const current = await this.findOne(id);

    const data = await this.prismaService.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { residentId: current.residentId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return data;
  }

  private async ensureResidentExists(id: number) {
    const resident = await this.prismaService.resident.findUnique({ where: { id } });
    if (!resident) {
      throw new NotFoundException(`Resident ${id} not found`);
    }
  }
}
