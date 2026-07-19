import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Admin, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminDto } from './dto/query-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

/** 新建用户 / 重置密码统一使用的默认密码（对齐 requirement_v2.0.md §5.5.1） */
const DEFAULT_ADMIN_PASSWORD = 'Dyyj123..';

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createAdminDto: CreateAdminDto) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    try {
      const admin = await this.prismaService.admin.create({
        data: { ...createAdminDto, passwordHash },
      });
      return this.toPublicAdmin(admin);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: QueryAdminDto) {
    const { page = 1, pageSize = 10, username, name, email, phone, keyword } = query;
    const where: Prisma.AdminWhereInput = {
      ...(username ? { username: { contains: username } } : {}),
      ...(name ? { name: { contains: name } } : {}),
      ...(email ? { email: { contains: email } } : {}),
      ...(phone ? { phone: { contains: phone } } : {}),
      ...(keyword
        ? {
            OR: [
              { username: { contains: keyword } },
              { name: { contains: keyword } },
              { phone: { contains: keyword } },
              { email: { contains: keyword } },
            ],
          }
        : {}),
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
    await this.getOrThrow(id);
    try {
      const admin = await this.prismaService.admin.update({
        where: { id },
        data: { ...updateAdminDto },
      });
      return this.toPublicAdmin(admin);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number, currentAdminId: number) {
    const admin = await this.getOrThrow(id);
    this.assertNotSelfOrSuperAdmin(admin, currentAdminId, '删除');
    await this.prismaService.admin.delete({ where: { id } });
    return { id };
  }

  /** 状态开关：ENABLED <-> DISABLED，超级管理员与自身账号不可禁用 */
  async toggleStatus(id: number, currentAdminId: number) {
    const admin = await this.getOrThrow(id);
    this.assertNotSelfOrSuperAdmin(admin, currentAdminId, '禁用');
    const nextStatus = admin.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    const updated = await this.prismaService.admin.update({
      where: { id },
      data: { status: nextStatus },
    });
    return this.toPublicAdmin(updated);
  }

  /** 管理员触发：重置为默认密码 Dyyj123.. */
  async resetPassword(id: number) {
    await this.getOrThrow(id);
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    const updated = await this.prismaService.admin.update({
      where: { id },
      data: { passwordHash },
    });
    return this.toPublicAdmin(updated);
  }

  /** 顶栏「修改密码」自服务：仅本人可操作，需校验旧密码 */
  async changePassword(id: number, currentAdminId: number, dto: ChangePasswordDto) {
    if (id !== currentAdminId) {
      throw new ForbiddenException('只能修改自己的密码');
    }
    const admin = await this.getOrThrow(id);

    const isMatch = await bcrypt.compare(dto.oldPassword, admin.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('旧密码不正确');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.prismaService.admin.update({
      where: { id },
      data: { passwordHash },
    });
    return this.toPublicAdmin(updated);
  }

  private async getOrThrow(id: number): Promise<Admin> {
    const admin = await this.prismaService.admin.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException(`Admin ${id} not found`);
    }
    return admin;
  }

  private assertNotSelfOrSuperAdmin(admin: Admin, currentAdminId: number, action: string): void {
    if (admin.isSuperAdmin) {
      throw new ForbiddenException(`超级管理员不可被${action}`);
    }
    if (admin.id === currentAdminId) {
      throw new ForbiddenException(`不可对自己的账号执行${action}操作`);
    }
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
