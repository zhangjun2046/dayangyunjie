export type WechatOaCallbackEvent = {
  msgType: string;
  event: string;
  oaOpenid: string;
};

function xmlTag(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const plain = new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdata);
  if (cdataMatch?.[1]) {
    return cdataMatch[1].trim();
  }
  const plainMatch = xml.match(plain);
  return (plainMatch?.[1] ?? '').trim();
}

export function parseWechatOaXml(xml: string): WechatOaCallbackEvent {
  return {
    msgType: xmlTag(xml, 'MsgType').toLowerCase(),
    event: xmlTag(xml, 'Event').toLowerCase(),
    oaOpenid: xmlTag(xml, 'FromUserName'),
  };
}
