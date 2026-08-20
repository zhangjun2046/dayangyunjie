import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdminPermissionModule } from './modules/admin-permission/admin-permission.module';
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
import { BannerModule } from './modules/banner/banner.module';
import { OperatorModule } from './modules/operator/operator.module';
import { ReviewKeywordModule } from './modules/review-keyword/review-keyword.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ResidentModule,
    WorkerModule,
    AdminModule,
    AdminPermissionModule,
    AddressModule,
    ServiceCatalogModule,
    CleaningOrderModule,
    RecyclingOrderModule,
    ConsultOrderModule,
    UploadModule,
    ReviewModule,
    ComplaintModule,
    DashboardModule,
    BannerModule,
    OperatorModule,
    ReviewKeywordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
