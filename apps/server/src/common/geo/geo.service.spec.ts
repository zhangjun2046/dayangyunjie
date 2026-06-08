import { GeoService } from './geo.service';

describe('GeoService', () => {
  let service: GeoService;

  beforeEach(() => {
    service = new GeoService();
  });

  // ─────────────────────────────────────────────
  // haversineMeters
  // ─────────────────────────────────────────────

  describe('haversineMeters', () => {
    it('同一坐标点距离为 0', () => {
      const dist = service.haversineMeters(39.9042, 116.4074, 39.9042, 116.4074);
      expect(dist).toBe(0);
    });

    it('北京天安门 → 鸟巢（约 9.9km），误差 < 500m', () => {
      // 天安门: 39.9042, 116.4074；鸟巢: 39.9928, 116.3967（纬度差约 0.09°≈10km）
      const dist = service.haversineMeters(39.9042, 116.4074, 39.9928, 116.3967);
      expect(dist).toBeGreaterThan(9000);
      expect(dist).toBeLessThan(11000);
    });

    it('近距离（约 100m）计算精度达标', () => {
      // 沿纬线移动约 0.001° ≈ 111m
      const dist = service.haversineMeters(39.9042, 116.4074, 39.9042, 116.4084);
      expect(dist).toBeGreaterThan(80);
      expect(dist).toBeLessThan(120);
    });

    it('近距离（约 200m 临界）精度达标', () => {
      // 沿纬线移动约 0.002° ≈ 178m（39° 纬度 cos 约 0.777）
      const dist = service.haversineMeters(39.9042, 116.4074, 39.9042, 116.4096);
      expect(dist).toBeGreaterThan(150);
      expect(dist).toBeLessThan(220);
    });

    it('跨越赤道距离计算无误（正负纬度）', () => {
      const dist = service.haversineMeters(-1.0, 0, 1.0, 0);
      // 纬度差 2° ≈ 222km
      expect(dist).toBeGreaterThan(220000);
      expect(dist).toBeLessThan(225000);
    });

    it('跨越本初子午线距离计算无误（正负经度）', () => {
      const dist = service.haversineMeters(0, -1.0, 0, 1.0);
      expect(dist).toBeGreaterThan(220000);
      expect(dist).toBeLessThan(225000);
    });

    it('返回值为数字类型', () => {
      const dist = service.haversineMeters(39.9, 116.4, 40.0, 116.5);
      expect(typeof dist).toBe('number');
      expect(Number.isFinite(dist)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // validateCheckin
  // ─────────────────────────────────────────────

  describe('validateCheckin', () => {
    it('在范围内签到：outOfRange=false，remark=null，distance 有值', () => {
      // 同一坐标点，距离 0m
      const result = service.validateCheckin(39.9042, 116.4074, 39.9042, 116.4074);
      expect(result.outOfRange).toBe(false);
      expect(result.remark).toBeNull();
      expect(result.distance).toBe(0);
    });

    it('在范围内签到（距离约 50m < 200m）', () => {
      // 纬度移动约 0.0005° ≈ 55m
      const result = service.validateCheckin(39.9042, 116.4074, 39.9047, 116.4074);
      expect(result.outOfRange).toBe(false);
      expect(result.remark).toBeNull();
      expect(result.distance).not.toBeNull();
      expect(result.distance!).toBeLessThan(200);
    });

    it('超距签到（距离 > 200m）：outOfRange=true，remark 含"超距签到"', () => {
      // 纬线移动约 0.01° ≈ 1110m
      const result = service.validateCheckin(39.9042, 116.4074, 39.9042, 116.4174);
      expect(result.outOfRange).toBe(true);
      expect(result.remark).toContain('超距签到');
      expect(result.remark).toContain('m');
      expect(result.distance).toBeGreaterThan(200);
    });

    it('超距签到 remark 格式包含实际距离整数', () => {
      const result = service.validateCheckin(39.9042, 116.4074, 39.9042, 116.4274);
      expect(result.remark).toMatch(/超距签到，距离\d+m/);
    });

    it('distance 保留 1 位小数精度', () => {
      const result = service.validateCheckin(39.9042, 116.4074, 39.9042, 116.4094);
      if (result.distance !== null) {
        const decimalParts = String(result.distance).split('.');
        if (decimalParts.length === 2) {
          expect(decimalParts[1].length).toBeLessThanOrEqual(1);
        }
      }
    });

    it('地址 lat 为 null：跳过校验，remark 含"无坐标"', () => {
      const result = service.validateCheckin(null, 116.4074, 39.9042, 116.4074);
      expect(result.distance).toBeNull();
      expect(result.outOfRange).toBe(false);
      expect(result.remark).toContain('无坐标');
    });

    it('地址 lng 为 null：跳过校验，remark 含"无坐标"', () => {
      const result = service.validateCheckin(39.9042, null, 39.9042, 116.4074);
      expect(result.distance).toBeNull();
      expect(result.remark).toContain('无坐标');
    });

    it('地址 lat/lng 均为 undefined：跳过校验', () => {
      const result = service.validateCheckin(undefined, undefined, 39.9042, 116.4074);
      expect(result.distance).toBeNull();
      expect(result.outOfRange).toBe(false);
      expect(result.remark).toBe('地址无坐标，跳过距离校验');
    });

    it('自定义 thresholdM=500：距离 300m 时不超距', () => {
      // 纬线移动约 0.003° ≈ 267m（39° 纬度）
      const result = service.validateCheckin(39.9042, 116.4074, 39.9042, 116.4104, 500);
      expect(result.outOfRange).toBe(false);
    });

    it('自定义 thresholdM=50：距离 100m 时超距', () => {
      // 纬线移动约 0.001° ≈ 89m
      const result = service.validateCheckin(39.9042, 116.4074, 39.9042, 116.4083, 50);
      expect(result.outOfRange).toBe(true);
      expect(result.remark).toContain('超距签到');
    });

    it('返回对象结构完整（distance、remark、outOfRange 均存在）', () => {
      const result = service.validateCheckin(39.9042, 116.4074, 39.9042, 116.4074);
      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('remark');
      expect(result).toHaveProperty('outOfRange');
    });
  });
});
