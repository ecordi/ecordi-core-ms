import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class OauthService {
  private readonly logger = new Logger('OauthService');
  private readonly waMsBaseUrl: string;
  private readonly stateTtlSec = 10 * 60; // 10 minutes

  constructor(private readonly config: ConfigService, private readonly cache: CacheService) {
    this.waMsBaseUrl = this.config.get<string>('WA_CHANNEL_MS_URL')
      || this.config.get<string>('WHATSAPP_SERVICE_URL')
      || this.config.get<string>('WA_MS_BASE_URL')
      || 'http://whatsappcloud:6200';
  }

  async startFacebook(companyId?: string): Promise<{ url: string; state: string }>
  {
    const { data } = await axios.get<{ url: string; state: string }>(`${this.waMsBaseUrl}/auth/facebook`, {
      params: companyId ? { companyId } : undefined,
      timeout: 15000,
    });
    if (!data?.url || !data?.state) {
      this.logger.error('Invalid response from WA Channel MS /auth/facebook', data as any);
      throw new BadRequestException('Invalid response from auth provider');
    }
    await this.cache.set(this.getStateKey(data.state), { valid: true }, this.stateTtlSec);
    return data;
  }

  async completeFacebook(code: string, state: string): Promise<{ success: boolean }>
  {
    if (!code || !state) throw new BadRequestException('Missing code or state');

    const cached = await this.cache.get<{ valid: boolean }>(this.getStateKey(state));
    if (!cached?.valid) {
      throw new BadRequestException('Invalid or expired state');
    }

    try {
      await axios.get(`${this.waMsBaseUrl}/auth/facebook/callback`, {
        params: { code, state },
        headers: { Cookie: `oauth_state=${state}` },
        timeout: 20000,
      });
    } finally {
      await this.cache.delete(this.getStateKey(state));
    }

    return { success: true };
  }

  private getStateKey(state: string) {
    return `oauth:facebook:state:${state}`;
  }
}
