import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotifyService } from './notify.service';

const SCAN_INTERVAL_MS = 60 * 1000;

@Injectable()
export class NotifyScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotifyScheduler.name);
  private timer?: NodeJS.Timeout;
  private scanning = false;

  constructor(private readonly notifyService: NotifyService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.scan(), SCAN_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async scan(): Promise<void> {
    if (this.scanning) {
      return;
    }
    this.scanning = true;
    try {
      await this.notifyService.scanScheduled();
    } catch (error) {
      this.logger.warn(`notify scan failed: ${error instanceof Error ? error.message : 'unknown'}`);
    } finally {
      this.scanning = false;
    }
  }
}
