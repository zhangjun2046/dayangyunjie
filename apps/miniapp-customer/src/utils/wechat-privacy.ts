/**
 * 将用户同意同步到微信侧《小程序用户隐私保护指引》。
 * 自研弹窗只记本地状态，不能替代本接口。
 *
 * 未在公众平台配置指引时，微信不会弹窗，requirePrivacyAuthorize 会直接 success。
 */

export interface WechatPrivacySetting {
  /** 是否还需要向用户征求同意；未配置指引时为 false */
  needAuthorization: boolean;
  /** 后台配置的指引名称；未配置时为空 */
  privacyContractName: string;
}

export function getWechatPrivacySetting(): Promise<WechatPrivacySetting> {
  // #ifndef MP-WEIXIN
  return Promise.resolve({ needAuthorization: false, privacyContractName: '' });
  // #endif

  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    const api = wx as typeof wx & {
      getPrivacySetting?: (option: {
        success: (res: {
          needAuthorization: boolean;
          privacyContractName: string;
        }) => void;
        fail: (err: { errMsg?: string }) => void;
      }) => void;
    };
    if (typeof api.getPrivacySetting !== 'function') {
      reject(new Error('当前微信版本过低，请升级微信后重试'));
      return;
    }
    api.getPrivacySetting({
      success(res) {
        resolve({
          needAuthorization: !!res.needAuthorization,
          privacyContractName: res.privacyContractName || '',
        });
      },
      fail(err) {
        reject(new Error(err?.errMsg || '读取隐私设置失败'));
      },
    });
  });
  // #endif
}

export function requireWechatPrivacyAuthorize(): Promise<void> {
  // #ifndef MP-WEIXIN
  return Promise.resolve();
  // #endif

  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    const api = wx as typeof wx & {
      requirePrivacyAuthorize?: (option: {
        success: () => void;
        fail: (err: { errMsg?: string }) => void;
      }) => void;
    };
    if (typeof api.requirePrivacyAuthorize !== 'function') {
      reject(new Error('当前微信版本过低，请升级微信后重试'));
      return;
    }
    api.requirePrivacyAuthorize({
      success() {
        resolve();
      },
      fail(err) {
        reject(new Error(err?.errMsg || '未完成微信隐私授权'));
      },
    });
  });
  // #endif
}
