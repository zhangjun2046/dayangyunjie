import { Injectable } from '@nestjs/common';

/** GPS 签到校验结果 */
export interface GpsCheckinResult {
  /** 签到点与服务地址的距离（米，保留1位小数）；地址无坐标时为 null */
  distance: number | null;
  /** 异常说明（超距或无坐标时有值，正常范围内为 null） */
  remark: string | null;
  /** 是否超出允许距离阈值 */
  outOfRange: boolean;
}

/**
 * 地理位置服务：提供 Haversine 球面距离计算与 GPS 签到校验能力。
 * 设计为可复用的 NestJS Injectable，供保洁/废品等订单模块注入。
 */
@Injectable()
export class GeoService {
  private static readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * Haversine 公式：计算两点间球面距离（米）。
   * 适用于 200m 量级的短距离判断，精度优于 0.1%。
   */
  haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = GeoService.EARTH_RADIUS_METERS;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * 校验员工签到坐标是否在服务地址允许范围内。
   * - 地址有坐标：计算距离；超距返回 outOfRange=true + remark 说明，不阻断签到流程
   * - 地址无坐标：跳过校验，remark 标注说明
   *
   * @param addressLat  服务地址纬度（可为 null/undefined）
   * @param addressLng  服务地址经度（可为 null/undefined）
   * @param workerLat   员工签到纬度
   * @param workerLng   员工签到经度
   * @param thresholdM  允许距离阈值（默认 200 米）
   */
  validateCheckin(
    addressLat: number | null | undefined,
    addressLng: number | null | undefined,
    workerLat: number,
    workerLng: number,
    thresholdM = 200,
  ): GpsCheckinResult {
    if (typeof addressLat !== 'number' || typeof addressLng !== 'number') {
      console.info('[GeoService] address has no coordinates, distance check skipped');
      return { distance: null, remark: '地址无坐标，跳过距离校验', outOfRange: false };
    }

    const distanceM = this.haversineMeters(addressLat, addressLng, workerLat, workerLng);
    const distance = Math.round(distanceM * 10) / 10;

    if (distanceM > thresholdM) {
      const remark = `超距签到，距离${Math.round(distanceM)}m`;
      console.info(`[GeoService] out-of-range distance=${Math.round(distanceM)}m threshold=${thresholdM}m`);
      return { distance, remark, outOfRange: true };
    }

    return { distance, remark: null, outOfRange: false };
  }
}
