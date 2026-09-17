import { Controller, Get, Header, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WechatOaService } from './wechat-oa.service';

@ApiExcludeController()
@Controller('wechat/oa')
export class WechatOaController {
  constructor(private readonly wechatOaService: WechatOaService) {}

  @Get('callback')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  verifyCallback(
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
    @Res() res: Response,
  ): void {
    if (!this.wechatOaService.verifyCallbackSignature({ signature, timestamp, nonce })) {
      res.status(403).send('invalid signature');
      return;
    }
    res.status(200).send(echostr ?? '');
  }

  @Post('callback')
  @HttpCode(200)
  async handleCallback(
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
  ): Promise<void> {
    if (!this.wechatOaService.verifyPostCallbackQuery({ signature, timestamp, nonce })) {
      res.status(403).send('invalid signature');
      return;
    }
    const xml = this.readXmlBody(req);
    await this.wechatOaService.handleCallbackXml(xml);
    res.status(200).type('text/plain').send('success');
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.wechatOaService.resolveOauthCallback(code, state);
    const location = this.wechatOaService.adminLandingLocation(result);
    if (!location) {
      res.status(501).type('text/plain').send('wechat admin h5 base url unset');
      return;
    }
    res.redirect(302, location);
  }

  @Get('redirect')
  redirectToAdminOrder(
    @Query('type') type: string,
    @Query('id') id: string,
    @Res() res: Response,
  ): void {
    const location = this.wechatOaService.adminOrderRedirectLocation(type, id);
    if (!location) {
      res.status(400).type('text/plain').send('invalid redirect');
      return;
    }
    res.redirect(302, location);
  }

  private readXmlBody(req: Request & { rawBody?: Buffer }): string {
    if (Buffer.isBuffer(req.rawBody)) {
      return req.rawBody.toString('utf8');
    }
    if (typeof req.body === 'string') {
      return req.body;
    }
    return '';
  }
}
