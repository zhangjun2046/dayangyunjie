import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { AddressModule } from './modules/address/address.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { ResidentModule } from './modules/resident/resident.module';
import { WorkerModule } from './modules/worker/worker.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ResidentModule,
    WorkerModule,
    AdminModule,
    AddressModule,
    ServiceCatalogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
