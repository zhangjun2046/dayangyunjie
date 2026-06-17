/// <reference types="@dcloudio/types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

// WeChat mini-program global API (available at runtime via #ifdef MP-WEIXIN)
declare const wx: WechatMiniprogram.Wx;
