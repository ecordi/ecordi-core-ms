import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CacheService } from '../cache/cache.service';
import { ConnectionsService } from '../connections/connections.service';

@Injectable()
export class OauthService {
  private readonly logger = new Logger('OauthService');
  private readonly waMsBaseUrl: string;
  private readonly stateTtlSec = 10 * 60; // 10 minutes

  constructor(
    private readonly config: ConfigService, 
    private readonly cache: CacheService,
    private readonly connectionsService: ConnectionsService
  ) {
    this.waMsBaseUrl = this.config.get<string>('WA_CHANNEL_MS_URL') || this.config.get<string>('WA_MS_BASE_URL') || 'http://localhost:3000';
  }

  async startFacebook(): Promise<{ url: string; state: string }>
  {
    // Ask WA Channel MS for url+state
    const { data } = await axios.get<{ url: string; state: string }>(`${this.waMsBaseUrl}/auth/facebook`, { timeout: 15000 });
    if (!data?.url || !data?.state) {
      this.logger.error('Invalid response from WA Channel MS /auth/facebook', data);
      throw new BadRequestException('Invalid response from auth provider');
    }
    // Persist state in Redis for validation at callback
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
      // Forward to WA Channel MS with the state in Cookie header as required
      await axios.get(`${this.waMsBaseUrl}/auth/facebook/callback`, {
        params: { code, state },
        headers: { Cookie: `oauth_state=${state}` },
        timeout: 20000,
      });
    } finally {
      // Always consume the state (single-use)
      await this.cache.delete(this.getStateKey(state));
    }

    return { success: true };
  }

  private getStateKey(state: string) {
    return `oauth:facebook:state:${state}`;
  }

  async startInstagram(companyId?: string): Promise<{ url: string; state: string }> {
    try {
      // Crear una conexión pendiente en Core-MS si se proporciona companyId
      const connectionId = companyId ? `ig_${companyId}_${Date.now()}` : `ig_${Date.now()}`;
      
      if (companyId) {
        await this.connectionsService.createPendingInstagramConnection({
          connectionId,
          companyId,
          displayName: 'Instagram Connection'
        });
      }
      
      // Generar state para validación
      const state = JSON.stringify({ 
        companyId, 
        connectionId,
        timestamp: Date.now() 
      });
      
      // Solicitar URL de autorización al Instagram Channel MS
      const instagramMsBaseUrl = this.config.get<string>('INSTAGRAM_CHANNEL_MS_URL') || 'http://localhost:3001';
      const redirectUri = `${this.config.get<string>('CORE_MS_URL') || 'http://localhost:3000'}/oauth/instagram/callback`;
      
      const { data } = await axios.get<{ success: boolean, authUrl: string }>(
        `${instagramMsBaseUrl}/api/v1/channels/instagram/oauth/init`,
        { 
          params: { 
            redirectUri,
            companyId,
            state 
          },
          timeout: 15000 
        }
      );
      
      if (!data?.success || !data?.authUrl) {
        this.logger.error('Invalid response from Instagram Channel MS /oauth/init', data);
        throw new BadRequestException('Invalid response from auth provider');
      }
      
      // Persistir state en Redis para validación en callback
      await this.cache.set(this.getInstagramStateKey(state), { valid: true }, this.stateTtlSec);
      
      return { url: data.authUrl, state };
    } catch (error) {
      this.logger.error('Error starting Instagram OAuth:', error);
      throw error;
    }
  }

  async completeInstagram(code: string, state: string): Promise<{ success: boolean }> {
    if (!code || !state) throw new BadRequestException('Missing code or state');

    const cached = await this.cache.get<{ valid: boolean }>(this.getInstagramStateKey(state));
    if (!cached?.valid) {
      throw new BadRequestException('Invalid or expired state');
    }

    try {
      // Forward to Instagram Channel MS
      const instagramMsBaseUrl = this.config.get<string>('INSTAGRAM_CHANNEL_MS_URL') || 'http://localhost:3001';
      const redirectUri = `${this.config.get<string>('CORE_MS_URL') || 'http://localhost:3000'}/oauth/instagram/callback`;
      
      await axios.get(`${instagramMsBaseUrl}/api/v1/channels/instagram/oauth/callback`, {
        params: { code, state, redirectUri },
        timeout: 20000,
      });
    } finally {
      // Always consume the state (single-use)
      await this.cache.delete(this.getInstagramStateKey(state));
    }

    return { success: true };
  }

  private getInstagramStateKey(state: string) {
    return `oauth:instagram:state:${state}`;
  }
}
