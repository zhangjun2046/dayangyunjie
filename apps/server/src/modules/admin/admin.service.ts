import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Admin, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminDto } from './dto/query-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createAdminDto: CreateAdminDto) {
    const { password, ...rest } = createAdminDto;
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const admin = await this.prismaService.admin.create({
        data: { ...rest, passwordHash },
      });
      return this.toPublicAdmin(admin);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: QueryAdminDto) {
    const { page = 1, pageSize = 10, name, email } = query;
    const where: Prisma.AdminWhereInput = {
      ...(name ? { name: { contains: name } } : {}),
      ...(email ? { email: { contains: email } } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.admin.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      this.prismaService.admin.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toPublicAdmin(item)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const admin = await this.prismaService.admin.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException(`Admin ${id} not found`);
    }
    return this.toPublicAdmin(admin);
  }

  async update(id: number, updateAdminDto: UpdateAdminDto) {
    await this.findOne(id);
    const { password, ...rest } = updateAdminDto;
    const data: Prisma.AdminUpdateInput = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    try {
      const admin = await this.prismaService.admin.update({
        where: { id },
        data,
      });
      return this.toPublicAdmin(admin);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prismaService.admin.delete({ where: { id } });
    return { id };
  }

  private toPublicAdmin(admin: Admin) {
    const { passwordHash, ...rest } = admin;
    return rest;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Admin unique field already exists');
    }
    throw error;
  }
}
