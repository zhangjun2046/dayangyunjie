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
import { CleaningOrderModule } from './modules/cleaning-order/cleaning-order.module';
import { RecyclingOrderModule } from './modules/recycling-order/recycling-order.module';
import { ConsultOrderModule } from './modules/consult-order/consult-order.module';
import { UploadModule } from './modules/upload/upload.module';
import { ReviewModule } from './modules/review/review.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ResidentModule,
    WorkerModule,
    AdminModule,
    AddressModule,
    ServiceCatalogModule,
    CleaningOrderModule,
    RecyclingOrderModule,
    ConsultOrderModule,
    UploadModule,
    ReviewModule,
    ComplaintModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
