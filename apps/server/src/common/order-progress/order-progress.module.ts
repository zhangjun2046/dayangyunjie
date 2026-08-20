import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrderProgressService } from './order-progress.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [OrderProgressService],
  exports: [OrderProgressService],
})
export class OrderProgressModule {}
