import { Injectable, Logger } from '@nestjs/common';
import { EnvConfigService } from '../../common/config/env-config.service';

export type SmsSendInput = {
  phone: string;
  templateCode: string;
  templateParam?: Record<string, string>;
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly envConfigService: EnvConfigService) {}

  async send(input: SmsSendInput): Promise<boolean> {
    const phone = input.phone?.trim();
    if (!phone) {
      this.logger.log('sms skip: no phone reason=no_phone');
      return false;
    }
    if (!input.templateCode?.trim()) {
      this.logger.log('sms skip: template code unset reason=no_template');
      return false;
    }
    if (!this.envConfigService.hasSmsCredentials) {
      this.logger.log('sms skip: credentials unset reason=no_credentials');
      return false;
    }
    if ((this.envConfigService.smsProvider ?? '').toLowerCase() !== 'aliyun') {
      this.logger.log('sms skip: provider not aliyun reason=no_credentials');
      return false;
    }

    const accessKeyId = this.envConfigService.smsAccessKeyId;
    const accessKeySecret = this.envConfigService.smsAccessKeySecret;
    const signName = this.envConfigService.smsSignName;
    if (!accessKeyId || !accessKeySecret || !signName) {
      this.logger.log('sms skip: credentials unset reason=no_credentials');
      return false;
    }

    try {
      const Dysmsapi20170525 = (await import('@alicloud/dysmsapi20170525')).default;
      const openApi = await import('@alicloud/openapi-client');
      const dysmsapi = await import('@alicloud/dysmsapi20170525');

      const config = new openApi.Config({
        accessKeyId,
        accessKeySecret,
      });
      config.endpoint = this.envConfigService.smsEndpoint;
      const client = new Dysmsapi20170525(config);
      const request = new dysmsapi.SendSmsRequest({
        phoneNumbers: phone,
        signName,
        templateCode: input.templateCode,
        templateParam: input.templateParam ? JSON.stringify(input.templateParam) : undefined,
      });
      const result = await client.sendSms(request);
      const body = result.body as { code?: string; message?: string } | undefined;
      const code = body?.code;
      if (code && code !== 'OK') {
        this.logger.warn(`sms skip: provider error reason=provider_error code=${code} message=${body?.message}`);
        return false;
      }
      this.logger.log('sms accepted');
      return true;
    } catch (error) {
      this.logger.warn(`sms skip: send failed reason=provider_error ${error instanceof Error ? error.message : 'unknown'}`);
      return false;
    }
  }
}
