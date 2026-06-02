import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ResidentModule } from './modules/resident/resident.module';
import { WorkerModule } from './modules/worker/worker.module';

@Module({
  imports: [PrismaModule, AuthModule, ResidentModule, WorkerModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
