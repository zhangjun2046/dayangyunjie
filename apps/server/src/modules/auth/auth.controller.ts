import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentAdminDecorator } from './decorators/current-admin.decorator';
import { CurrentUserDecorator } from './decorators/current-user.decorator';
import { CurrentWorkerDecorator } from './decorators/current-worker.decorator';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ApiResponseDto, LoginResultDto } from './dto/auth-response.dto';
import { BindWechatDto } from './dto/bind-wechat.dto';
import { DecryptPhoneDto } from './dto/decrypt-phone.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { WorkerLoginDto } from './dto/worker-login.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WorkerJwtAuthGuard } from './guards/worker-jwt-auth.guard';
import { AdminCurrentUser } from './interfaces/admin-current-user.interface';
import { CurrentUser } from './interfaces/current-user.interface';
import { WorkerCurrentUser } from './interfaces/worker-current-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat-login')
  @ApiOperation({
    summary: '微信登录并签发 JWT',
    description:
      '已配置 WECHAT_CUSTOMER_APPID/SECRET 时调用 code2session；未配置时使用 mock openid（本地开发）',
  })
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
            openid: 'oXXXX',
            nickname: '张三',
            avatar: 'https://example.com/avatar.jpg',
            phone: '13800138000',
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

  @Post('decrypt-phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '用 getPhoneNumber code 解密获取手机号并绑定当前居民',
    description:
      '已配置微信凭证时调用 getuserphonenumber；未配置时返回确定性 mock 手机号。需登录。',
  })
  @ApiOkResponse({
    description: '解密成功',
    schema: { example: { code: 0, message: 'ok', data: { phone: '13812345678' } } },
  })
  @ApiUnauthorizedResponse({ description: '未携带 token 或 token 无效' })
  async decryptPhone(
    @Body() body: DecryptPhoneDto,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<ApiResponseDto<{ phone: string }>> {
    const data = await this.authService.decryptPhone(body.code, user);
    return { code: 0, message: 'ok', data };
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

  @Get('worker-wechat-bind')
  @UseGuards(WorkerJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询当前员工微信（服务号）绑定状态' })
  @ApiUnauthorizedResponse({ description: '未携带 Worker Token 或 Token 无效' })
  async getWorkerWechatBind(
    @CurrentWorkerDecorator() user: WorkerCurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AuthService['getWorkerWechatBindStatus']>>>> {
    const data = await this.authService.getWorkerWechatBindStatus(user.workerId);
    return { code: 0, message: 'ok', data };
  }

  @Post('worker-wechat-bind')
  @UseGuards(WorkerJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '用员工端 wx.login code 绑定 unionid',
    description:
      '仅使用 WECHAT_WORKER_* 调 code2session；未绑定不挡登录与接单。禁止客户端提交 workerId。',
  })
  @ApiUnauthorizedResponse({ description: '未携带 Worker Token 或 Token 无效' })
  async bindWorkerWechat(
    @Body() body: BindWechatDto,
    @CurrentWorkerDecorator() user: WorkerCurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AuthService['bindWorkerWechat']>>>> {
    const data = await this.authService.bindWorkerWechat(user.workerId, body.code);
    return { code: 0, message: 'ok', data };
  }

  @Post('admin-login')
  @ApiOperation({ summary: '管理员邮箱+密码登录，签发 Admin JWT' })
  @ApiOkResponse({
    description: '登录成功',
    schema: {
      example: {
        code: 0,
        message: 'ok',
        data: {
          tokens: {
            accessToken: 'admin_access_token',
            refreshToken: 'admin_refresh_token',
            expiresIn: 7200,
          },
          admin: {
            id: 1,
            email: 'admin@dayunyunjie.com',
            name: '管理员',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '邮箱或密码错误' })
  async adminLogin(
    @Body() body: AdminLoginDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AuthService['adminLogin']>>>> {
    const data = await this.authService.adminLogin(body);
    return { code: 0, message: 'ok', data };
  }

  @Get('admin-wechat-bind')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询当前运营服务号绑定状态' })
  async getAdminWechatBind(
    @CurrentAdminDecorator() user: AdminCurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AuthService['getAdminWechatBindStatus']>>>> {
    const data = await this.authService.getAdminWechatBindStatus(user.adminId);
    return { code: 0, message: 'ok', data };
  }

  @Get('admin-wechat-oauth-url')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '签发服务号 snsapi_base 授权 URL（须在微信内打开 H5）',
    description: 'state 只存哈希；redirect_uri 为 API 的 oauth/callback，禁止客户端提交 adminId',
  })
  async getAdminWechatOauthUrl(
    @CurrentAdminDecorator() user: AdminCurrentUser,
  ): Promise<ApiResponseDto<{ url: string }>> {
    const data = await this.authService.createAdminWechatOauthUrl(user.adminId);
    return { code: 0, message: 'ok', data };
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

  @Get('resident-wechat-bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询当前居民微信（服务号）绑定状态' })
  @ApiUnauthorizedResponse({ description: '未携带 token 或 token 无效' })
  async getResidentWechatBind(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AuthService['getResidentWechatBindStatus']>>>> {
    const data = await this.authService.getResidentWechatBindStatus(user.residentId);
    return { code: 0, message: 'ok', data };
  }

  @Post('resident-wechat-bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '用居民端 wx.login code 回填 unionid',
    description: '只写 unionid 并尝试配对粉丝表，不换 token、不动登录态。认 JWT residentId。',
  })
  @ApiUnauthorizedResponse({ description: '未携带 token 或 token 无效' })
  async bindResidentWechat(
    @Body() body: BindWechatDto,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AuthService['bindResidentWechat']>>>> {
    const data = await this.authService.bindResidentWechat(user.residentId, body.code);
    return { code: 0, message: 'ok', data };
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
            openid: 'oXXXX',
            nickname: '张三',
            avatar: 'https://example.com/avatar.jpg',
            phone: '13800138000',
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
