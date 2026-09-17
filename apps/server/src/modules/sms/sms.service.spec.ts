import { SmsService } from './sms.service';

describe('SmsService', () => {
  it('未配 AccessKey 时 no-op 且不抛错', async () => {
    const env = {
      hasSmsCredentials: false,
      smsProvider: 'aliyun',
      smsAccessKeyId: undefined,
      smsAccessKeySecret: undefined,
      smsSignName: '北京大洋云洁',
      smsEndpoint: 'dysmsapi.aliyuncs.com',
    };
    const sms = new SmsService(env as never);
    await expect(
      sms.send({ phone: '13800138000', templateCode: 'SMS_512410706', templateParam: { serviceName: '保洁服务' } }),
    ).resolves.toBe(false);
  });

  it('手机号或模板空则跳过', async () => {
    const env = {
      hasSmsCredentials: true,
      smsProvider: 'aliyun',
      smsAccessKeyId: 'id',
      smsAccessKeySecret: 'secret',
      smsSignName: '北京大洋云洁',
      smsEndpoint: 'dysmsapi.aliyuncs.com',
    };
    const sms = new SmsService(env as never);
    await expect(sms.send({ phone: '  ', templateCode: 'SMS_1' })).resolves.toBe(false);
    await expect(sms.send({ phone: '13800138000', templateCode: '' })).resolves.toBe(false);
  });
});
