import { parseWechatOaXml } from './wechat-oa-xml';

describe('parseWechatOaXml', () => {
  it('reads subscribe FromUserName from CDATA', () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh]]></ToUserName>
      <FromUserName><![CDATA[oa_openid_1]]></FromUserName>
      <MsgType><![CDATA[event]]></MsgType>
      <Event><![CDATA[subscribe]]></Event>
    </xml>`;
    expect(parseWechatOaXml(xml)).toEqual({
      msgType: 'event',
      event: 'subscribe',
      oaOpenid: 'oa_openid_1',
    });
  });

  it('reads unsubscribe without CDATA', () => {
    const xml =
      '<xml><FromUserName>oa_2</FromUserName><MsgType>event</MsgType><Event>unsubscribe</Event></xml>';
    expect(parseWechatOaXml(xml)).toEqual({
      msgType: 'event',
      event: 'unsubscribe',
      oaOpenid: 'oa_2',
    });
  });
});
