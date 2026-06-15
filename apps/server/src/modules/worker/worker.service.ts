import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Worker } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { QueryWorkerDto } from './dto/query-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

@Injectable()
export class WorkerService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createWorkerDto: CreateWorkerDto) {
    const { password, ...rest } = createWorkerDto;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const worker = await this.prismaService.worker.create({
        data: { ...rest, passwordHash },
      });
      return this.toPublicWorker(worker);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: QueryWorkerDto) {
    const { page = 1, pageSize = 10, name, phone, status } = query;
    const where: Prisma.WorkerWhereInput = {
      ...(name ? { name: { contains: name } } : {}),
      ...(phone ? { phone: { contains: phone } } : {}),
      ...(status ? { status } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.worker.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      this.prismaService.worker.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toPublicWorker(item)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const worker = await this.prismaService.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker ${id} not found`);
    }
    return this.toPublicWorker(worker);
  }

  async update(id: number, updateWorkerDto: UpdateWorkerDto) {
    await this.findOne(id);
    const { password, ...rest } = updateWorkerDto;
    const data: Prisma.WorkerUpdateInput = { ...rest };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    try {
      const worker = await this.prismaService.worker.update({
        where: { id },
        data,
      });
      return this.toPublicWorker(worker);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prismaService.worker.delete({ where: { id } });
    return { id };
  }

  async changePassword(id: number, oldPassword: string, newPassword: string) {
    const worker = await this.prismaService.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker ${id} not found`);
    }

    const isMatch = await bcrypt.compare(oldPassword, worker.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('旧密码不正确');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await this.prismaService.worker.update({
      where: { id },
      data: { passwordHash },
    });
    return this.toPublicWorker(updated);
  }

  async resetPassword(id: number) {
    const worker = await this.prismaService.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker ${id} not found`);
    }

    const passwordHash = await bcrypt.hash(worker.phone, 10);
    const updated = await this.prismaService.worker.update({
      where: { id },
      data: { passwordHash },
    });
    return this.toPublicWorker(updated);
  }

  private toPublicWorker(worker: Worker) {
    const { passwordHash, ...rest } = worker;
    return rest;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Worker unique field already exists');
    }
    throw error;
  }
}
