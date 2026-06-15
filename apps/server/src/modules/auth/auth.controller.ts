import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUserDecorator } from './decorators/current-user.decorator';
import { ApiResponseDto, LoginResultDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { WorkerLoginDto } from './dto/worker-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './interfaces/current-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat-login')
  @ApiOperation({ summary: '微信登录（mock）并签发 JWT' })
  @ApiOkResponse({
    description: '登录成功',
    schema: {
      example: {
        code: 0,
        message: 'ok',
        data: {
          tokens: {
            accessToken: 'access_token',
            refreshToken: 'refresh_token',
            expiresIn: 7200,
          },
          resident: {
            id: 1,
            openid: 'mock_openid_xxx',
            nickname: '张三',
            avatar: 'https://example.com/avatar.jpg',
          },
        },
      },
    },
  })
  async wechatLogin(
    @Body() body: WechatLoginDto,
  ): Promise<ApiResponseDto<LoginResultDto>> {
    const data = await this.authService.wechatLogin(body);
    return {
      code: 0,
      message: 'ok',
      data,
    };
  }

  @Post('worker-login')
  @ApiOperation({ summary: '员工手机号+密码登录，签发 Worker JWT' })
  @ApiOkResponse({
    description: '登录成功',
    schema: {
      example: {
        code: 0,
        message: 'ok',
        data: {
          tokens: {
            accessToken: 'worker_access_token',
            refreshToken: 'worker_refresh_token',
            expiresIn: 7200,
          },
          worker: {
            id: 1,
            phone: '13800138001',
            name: '张师傅',
            employeeNo: 'W001',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '手机号或密码错误' })
  async workerLogin(
    @Body() body: WorkerLoginDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AuthService['workerLogin']>>>> {
    const data = await this.authService.workerLogin(body);
    return {
      code: 0,
      message: 'ok',
      data,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: '使用 refresh token 刷新访问令牌' })
  @ApiOkResponse({
    description: '刷新成功',
    schema: {
      example: {
        code: 0,
        message: 'ok',
        data: {
          tokens: {
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
            expiresIn: 7200,
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'refresh token 无效或过期' })
  async refreshToken(
    @Body() body: RefreshTokenDto,
  ): Promise<ApiResponseDto<{ tokens: LoginResultDto['tokens'] }>> {
    const data = await this.authService.refreshToken(body);
    return {
      code: 0,
      message: 'ok',
      data,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录居民信息（受保护）' })
  @ApiOkResponse({
    description: '获取成功',
    schema: {
      example: {
        code: 0,
        message: 'ok',
        data: {
          resident: {
            id: 1,
            openid: 'mock_openid_xxx',
            nickname: '张三',
            avatar: 'https://example.com/avatar.jpg',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '未携带 token 或 token 无效' })
  async getProfile(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<
    ApiResponseDto<{
      resident: LoginResultDto['resident'];
    }>
  > {
    const data = await this.authService.getProfile(user);
    return {
      code: 0,
      message: 'ok',
      data,
    };
  }
}
