/**
 * 微信小程序 <image> 加载网络图走 downloadFile，体验版/真机即使 API（uni.request）已通，
 * http://IP 图片仍会被拦。这里改用 uni.request 拉二进制，写入本地后再给 <image> 显示。
 */

const inflight = new Map<string, Promise<string>>();

function getUserDataPath(): string {
  try {
    return wx.env?.USER_DATA_PATH ?? '';
  } catch {
    return '';
  }
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function fileExt(url: string): string {
  const path = url.split('?')[0] ?? '';
  const match = path.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
}

function isIpv4Host(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** 本地路径、微信临时文件、正规 HTTPS 域名可直接给 <image>；http 或 IP 必须转本地 */
export function needsLocalFetch(src: string): boolean {
  if (!src || !/^https?:\/\//i.test(src)) return false;
  if (src.startsWith('http://')) return true;
  try {
    const host = src.replace(/^https?:\/\//i, '').split('/')[0]?.split(':')[0] ?? '';
    return isIpv4Host(host);
  } catch {
    return true;
  }
}

function toArrayBuffer(data: unknown): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  if (typeof data === 'string' && data) {
    return uni.base64ToArrayBuffer(data);
  }
  return new ArrayBuffer(0);
}

function accessFile(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.getFileSystemManager().access({
      path: filePath,
      success: () => resolve(true),
      fail: () => resolve(false),
    });
  });
}

function writeBinaryFile(filePath: string, data: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().writeFile({
      filePath,
      data,
      encoding: 'binary',
      success: () => resolve(),
      fail: (err) => reject(err),
    });
  });
}

/** /uploads/xxx → /api/v1/upload/file/xxx，与已通的 API 前缀一致 */
function toApiFileUrl(src: string): string | null {
  const match = src.match(/^(https?:\/\/[^/?#]+)\/uploads\/([^/?#]+)/i);
  if (!match) return null;
  return `${match[1]}/api/v1/upload/file/${match[2]}`;
}

function requestArrayBuffer(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error(`图片下载失败 HTTP ${res.statusCode}`));
          return;
        }
        const buf = toArrayBuffer(res.data);
        if (!buf.byteLength) {
          reject(new Error('图片内容为空'));
          return;
        }
        resolve(buf);
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  try {
    return await requestArrayBuffer(url);
  } catch (err) {
    const fallback = toApiFileUrl(url);
    if (fallback && fallback !== url) {
      console.info('[remote-image] fallback to API file url', fallback);
      return requestArrayBuffer(fallback);
    }
    throw err;
  }
}

/**
 * 把网络图片转成小程序本地路径；无需转换时原样返回。
 * 同一 URL 会复用进行中的请求和本地缓存文件。
 */
export function resolveDisplayImage(src: string): Promise<string> {
  if (!src || !needsLocalFetch(src)) {
    return Promise.resolve(src);
  }

  const cached = inflight.get(src);
  if (cached) return cached;

  const task = (async () => {
    const dir = getUserDataPath();
    if (!dir) return src;

    const filePath = `${dir}/img_${hashUrl(src)}.${fileExt(src)}`;
    if (await accessFile(filePath)) {
      return filePath;
    }

    const buf = await fetchAsArrayBuffer(src);
    await writeBinaryFile(filePath, buf);
    return filePath;
  })();

  inflight.set(src, task);
  task.catch(() => {
    inflight.delete(src);
  });
  return task;
}

/** 预览网络图：先转成本地路径，避免 previewImage 同样被 downloadFile 拦住 */
export async function previewNetworkImages(
  urls: string[],
  current: number = 0,
): Promise<void> {
  if (!urls.length) return;
  const localUrls = await Promise.all(urls.map((url) => resolveDisplayImage(url)));
  const currentUrl = localUrls[current] ?? localUrls[0];
  uni.previewImage({
    current: currentUrl,
    urls: localUrls,
  });
}
