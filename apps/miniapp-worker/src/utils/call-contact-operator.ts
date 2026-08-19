import { fetchContactOperators, type OperatorDto } from '@/api/operator';

/** 拨打电话（去掉空格与短横线，兼容 400 号） */
export function dialPhone(phone: string): void {
  const phoneNumber = phone.replace(/[\s-]/g, '');
  if (!phoneNumber) {
    uni.showToast({ title: '暂无有效电话', icon: 'none' });
    return;
  }
  uni.makePhoneCall({
    phoneNumber,
    complete(e) {
      console.info('[call-contact] makePhoneCall complete', e);
    },
  });
}

/** 拉取运营人员列表，接口返回几条用几条 */
export async function loadContactOperators(): Promise<OperatorDto[]> {
  try {
    return (await fetchContactOperators()) ?? [];
  } catch (err) {
    console.info('[call-contact] load failed:', String(err));
    return [];
  }
}

export type ContactOperatorPickerLike = {
  open: (items: OperatorDto[]) => void;
};

/**
 * 一条直接拨打；多条打开选择弹窗；无数据提示
 */
export async function callContactOperator(
  picker: ContactOperatorPickerLike | null | undefined,
): Promise<void> {
  uni.showLoading({ title: '加载中', mask: true });
  const list = await loadContactOperators();
  uni.hideLoading();

  if (list.length === 0) {
    uni.showToast({ title: '暂无管理员电话', icon: 'none' });
    return;
  }

  if (list.length === 1) {
    dialPhone(list[0].phone);
    return;
  }

  if (!picker) {
    dialPhone(list[0].phone);
    return;
  }

  picker.open(list);
}
