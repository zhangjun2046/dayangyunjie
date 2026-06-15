import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EnvConfigModule } from '../../common/config/env-config.module';
import { EnvConfigService } from '../../common/config/env-config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WorkerJwtStrategy } from './strategies/worker-jwt.strategy';

@Module({
  imports: [
    EnvConfigModule,
    JwtModule.registerAsync({
      imports: [EnvConfigModule],
      inject: [EnvConfigService],
      useFactory: (envConfigService: EnvConfigService) => ({
        secret: envConfigService.jwtAccessSecret,
        signOptions: { expiresIn: envConfigService.jwtAccessExpiresIn as never },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, WorkerJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
