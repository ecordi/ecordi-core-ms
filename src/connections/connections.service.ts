import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Connection,
  ConnectionDocument,
  ConnectionStatus,
} from "./connection-ref.schema";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { signPayload, verifySignature } from "../common/hmac.util";
import { EventsService } from "../events/events.service";
import { NatsTransportService } from "../transports/nats-transport.service";
import axios from "axios";
import process from "process";

interface StateData {
  connectionId: string;
  companyId: string;
}
@Injectable()
export class ConnectionsService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    @InjectModel(Connection.name)
    private readonly connModel: Model<ConnectionDocument>,
    private readonly config: ConfigService,
    private readonly events: EventsService,
    private readonly bus: NatsTransportService
  ) {}

  async onModuleInit() {
    this.logger.log('ConnectionsService initialized');
  }

  /**
   * Unified callback processor that determines which channel to finalize based on pending connection state
   */
  async processConnectionCallback(code: string, state: string): Promise<any> {
    // Decode state to learn connectionId/companyId
    const [encodedData, signature] = state.split('.');
    if (!encodedData || !signature) {
      throw new HttpException('Invalid state format', HttpStatus.BAD_REQUEST);
    }
    const decodedData = Buffer.from(encodedData, 'base64').toString('utf8');
    if (!verifySignature(decodedData, signature, this.getStateSecret())) {
      throw new HttpException('Invalid state signature', HttpStatus.BAD_REQUEST);
    }
    const stateData: StateData = JSON.parse(decodedData);
    const { connectionId, companyId } = stateData;

    // Load pending connection to identify channel
    const pending = await this.connModel.findOne({ connectionId, companyId, status: ConnectionStatus.PENDING });
    if (!pending) {
      throw new HttpException('Pending connection not found', HttpStatus.NOT_FOUND);
    }

    if (pending.channel === 'instagram') {
      return this.createInstagramConnection(code, state);
    }
    if (pending.channel === 'facebook') {
      return this.createFacebookConnection(code, state);
    }
    // default to WhatsApp flow
    return this.createWhatsAppConnection(code, state);
  }

  /**
   * Finalize Facebook (Pages/Messenger) OAuth: exchange code -> token and ask Channel-MS to register pages
   */
  async createFacebookConnection(code: string, state: string): Promise<any> {
    try {
      // Decode and verify state
      const [encodedData, signature] = state.split('.');
      if (!encodedData || !signature) throw new Error('Invalid state format');
      const decodedData = Buffer.from(encodedData, 'base64').toString('utf8');
      if (!verifySignature(decodedData, signature, this.getStateSecret())) {
        throw new Error('Invalid state signature');
      }
      const stateData: StateData = JSON.parse(decodedData);
      const { connectionId, companyId } = stateData;

      // Find pending connection with channel=facebook
      const connection = await this.connModel.findOne({ connectionId, companyId, channel: 'facebook', status: ConnectionStatus.PENDING });
      if (!connection) throw new HttpException('Connection not found or not pending', HttpStatus.NOT_FOUND);
      const metaGraphVersion = this.config.get<string>('META_GRAPH_VERSION') || 'v18.0';
      // Exchange code for short-lived token (use Facebook app credentials)
      const appId = this.config.get<string>('FACEBOOK_APP_ID');
      const appSecret = this.config.get<string>('FACEBOOK_APP_SECRET');
      const redirectUri = this.config.get<string>('FACEBOOK_REDIRECT_URI');
      if (!appId || !appSecret || !redirectUri) throw new HttpException('Missing Facebook app configuration', HttpStatus.INTERNAL_SERVER_ERROR);

      this.logger.debug(`[FB OAuth] Using Graph API version: ${metaGraphVersion}`);
      this.logger.debug(`[FB OAuth] Exchange code for token - appId: ${appId}, redirectUri: ${redirectUri}`);

      const response = await axios.get(`https://graph.facebook.com/${metaGraphVersion}/oauth/access_token`, {
        params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
      });
      const shortLivedToken = response?.data?.access_token;
      if (!shortLivedToken) throw new HttpException('No access token in response', HttpStatus.BAD_REQUEST);

      // Try to exchange for a long-lived token
      let longLivedToken: string | undefined;
      try {
        const longResp = await axios.get(`https://graph.facebook.com/${metaGraphVersion}/oauth/access_token`, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: shortLivedToken,
          },
        });
        longLivedToken = longResp?.data?.access_token;
        console.log("🚀 ~ file: connections.service.ts:113 ~ longLivedToken:", longLivedToken)
        if (!longLivedToken) this.logger.warn('[FB OAuth] Could not retrieve long-lived token; proceeding with short-lived only');
      } catch (e: any) {
        this.logger.warn(`[FB OAuth] Long-lived exchange failed: ${e?.message}`);
      }

      // Update state
      connection.status = ConnectionStatus.CODE_RECEIVED;
      await connection.save();

      // Prepare default webhooks similar to IG/WA
      const apiUrl = this.config.get<string>('CORE_PUBLIC_BASE_URL');
      const apiKey = connection.verifyToken;
      const webhooks = [
        { type: 'httpRequest', action: `${apiUrl}/api/v1/channels/events`, params: { headers: { Authorization: `Basic ${apiKey}` } } },
        { type: 'status', action: `${apiUrl}/api/v1/social`, params: { headers: { Authorization: `Basic ${apiKey}` } } },
        { type: 'messageStatus', action: `${apiUrl}/api/v1/channels/messageStatus`, params: { headers: { Authorization: `Basic ${apiKey}` } } },
        { type: 'channelStatus', action: `${apiUrl}/api/v1/channels/status`, params: { headers: { Authorization: `Basic ${apiKey}` } } },
      ];

      // Retrieve userId from Graph API using short-lived token
      const accessTokenToUse = longLivedToken || shortLivedToken;
      this.logger.debug(`[FB OAuth] Getting user info with token: ${accessTokenToUse?.substring(0, 10)}...`);
      
      let userId: string;
      try {
        const meResp = await axios.get(`https://graph.facebook.com/${metaGraphVersion}/me`, {
          params: { fields: 'id,name', access_token: accessTokenToUse },
        });
        this.logger.debug(`[FB OAuth] User info response: ${JSON.stringify(meResp.data)}`);
        
        userId = meResp?.data?.id;
        if (!userId) {
          throw new HttpException('Failed to resolve userId from token', HttpStatus.BAD_REQUEST);
        }
      } catch (error: any) {
        this.logger.error(`[FB OAuth] Failed to get user info: ${error.message}`);
        if (error.response) {
          this.logger.error(`[FB OAuth] API Error: ${JSON.stringify(error.response.data)}`);
        }
        throw new HttpException(`Failed to get user info: ${error.message}`, HttpStatus.BAD_REQUEST);
      }

      // Ask Channel-MS (Facebook Channel) to register pages with expected payload shape
      const payload = {
        // Required by Channel-MS registerPages
        userId,
        token: accessTokenToUse,
        webhooks,
        // Optional correlation fields (Channel-MS may ignore these, but useful for tracing)
        connectionId,
        companyId,
        verifyToken: connection.verifyToken,
      };
      this.logger.debug(`[FB OAuth] Publishing facebook.connection.register: ${JSON.stringify({ ...payload, token: '***' })}`);
      await this.bus.registerFacebookConnection(payload);

      return { success: true, connectionId, companyId, status: ConnectionStatus.CODE_RECEIVED };
    } catch (error: any) {
      this.logger.error(`Error creating Facebook connection: ${error.message}`);
      throw new HttpException('Failed to create Facebook connection', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ================= Facebook OAuth (Core handles OAuth) =================
  async initFacebookConnection(dto: { companyId: string }): Promise<any> {
    const { companyId } = dto;

    // Create a pending connection (channel=facebook)
    const connectionId = `fb_${companyId}_${Date.now()}`;
    const connection = new this.connModel({
      companyId,
      channel: 'facebook',
      connectionId,
      status: ConnectionStatus.PENDING,
      verifyToken: crypto.randomBytes(16).toString('hex'),
    });
    await connection.save();

    // Create signed state with HMAC like other flows
    const stateData: StateData = { connectionId, companyId };
    const encodedData = Buffer.from(JSON.stringify(stateData)).toString('base64');
    const signature = signPayload(JSON.stringify(stateData), this.getStateSecret());
    const state = `${encodedData}.${signature}`;

    // Get redirect URI from config
    const redirectUri = this.config.get<string>('FACEBOOK_REDIRECT_URI');
    if (!redirectUri) {
      throw new HttpException('Missing FACEBOOK_REDIRECT_URI', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Build Facebook authorization URL
    const authUrl = this.buildFacebookAuthorizeUrl(state, redirectUri);

    return {
      success: true,
      companyId,
      connectionId,
      channel: 'facebook',
      status: ConnectionStatus.PENDING,
      authUrl,
    };
  }

  private getStateSecret(): string {
    const secret =
      this.config.get<string>("STATE_SECRET") ||
      this.config.get<string>("JWT_SECRET") ||
      "";
    if (!secret) {
      this.logger.warn(
        "Missing STATE_SECRET/JWT_SECRET for state signing; using insecure default"
      );
      return "insecure-default-secret";
    }
    return secret;
  }

  private buildWhatsAppAuthorizeUrl(state: string, redirectUri: string): string {
    // Use WhatsApp App ID for WhatsApp connections
    const appId = this.config.get<string>("WHATSAPP_APP_ID") || this.config.get<string>("FACEBOOK_APP_ID");
    if (!appId) {
      throw new HttpException("Missing WHATSAPP_APP_ID/FACEBOOK_APP_ID", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const baseUrl = "https://www.facebook.com/v18.0/dialog/oauth";
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: state,
      scope: "whatsapp_business_management,whatsapp_business_messaging",
      response_type: "code",
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private buildFacebookAuthorizeUrl(state: string, redirectUri: string): string {
    // Use Facebook App ID for Facebook connections
    const appId = this.config.get<string>("FACEBOOK_APP_ID");
    if (!appId) {
      throw new HttpException("Missing FACEBOOK_APP_ID", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const metaGraphVersion = this.config.get<string>('META_GRAPH_VERSION') || 'v23.0';
    const baseUrl = `https://www.facebook.com/${metaGraphVersion}/dialog/oauth`;
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: state,
      scope: "pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_posts,pages_messaging",
      response_type: "code",
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private buildInstagramAuthorizeUrl(state: string, redirectUri: string): string {
    // Use Instagram App ID for Instagram connections
    const appId = this.config.get<string>("INSTAGRAM_APP_ID") || this.config.get<string>("FACEBOOK_APP_ID");
    if (!appId) {
      throw new HttpException("Missing INSTAGRAM_APP_ID/FACEBOOK_APP_ID", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const metaGraphVersion = this.config.get<string>('META_GRAPH_VERSION') || 'v23.0';
    const baseUrl = `https://www.facebook.com/${metaGraphVersion}/dialog/oauth`;
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: state,
      scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
      response_type: "code",
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async initWhatsAppConnection(dto: any): Promise<any> {
    const { companyId } = dto;
    
    // Generate unique connection ID
    const connectionId = `conn_${companyId}_${Date.now()}`;
    
    // Create state data and sign it
    const stateData: StateData = { connectionId, companyId };
    const encodedData = Buffer.from(JSON.stringify(stateData)).toString('base64');
    const signature = signPayload(JSON.stringify(stateData), this.getStateSecret());
    const state = `${encodedData}.${signature}`;
    
    // Get redirect URI from config
    const redirectUri = this.config.get<string>("FACEBOOK_REDIRECT_URI");
    if (!redirectUri) {
      throw new HttpException("Missing FACEBOOK_REDIRECT_URI", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Build WhatsApp authorization URL
    const authUrl = this.buildWhatsAppAuthorizeUrl(state, redirectUri);

    // Create pending connection record
    const connection = new this.connModel({
      companyId,
      channel: 'whatsapp_cloud',
      connectionId,
      status: ConnectionStatus.PENDING,
      verifyToken: crypto.randomBytes(32).toString('hex'),
    });

    await connection.save();

    this.logger.log(`Created pending connection ${connectionId} for company ${companyId}`);

    return {
      connectionId,
      companyId,
      channel: 'whatsapp_cloud',
      status: ConnectionStatus.PENDING,
      authUrl,
      success: true,
    };
  }

  async createWhatsAppConnection(code: string, state: string): Promise<any> {
    try {
      // Decode state (state should be base64 encoded JSON + signature)
      const [encodedData, signature] = state.split('.');
      if (!encodedData || !signature) {
        throw new Error('Invalid state format');
      }
      
      const decodedData = Buffer.from(encodedData, 'base64').toString('utf8');
      
      // Verify signature
      if (!verifySignature(decodedData, signature, this.getStateSecret())) {
        throw new Error('Invalid state signature');
      }
      
      const stateData: StateData = JSON.parse(decodedData);
      const { connectionId, companyId } = stateData;

      // Find the pending connection
      const connection = await this.connModel.findOne({
        connectionId,
        companyId,
        status: ConnectionStatus.PENDING,
      });

      if (!connection) {
        throw new HttpException("Connection not found or not pending", HttpStatus.NOT_FOUND);
      }

      // Exchange code for short-lived token and get phone number data
      const tokenData = await this.exchangeCodeForTokenAndGetPhoneData(code);

      // Update connection status
      connection.status = ConnectionStatus.CODE_RECEIVED;
      await connection.save();

      // Create webhook configuration for the connection
      const apiUrl = this.config.get<string>("CORE_PUBLIC_BASE_URL");
      const apiKey = connection.verifyToken; // Using verifyToken as API key for webhook authentication
      
      const webhooks = [
        {
          type: 'httpRequest',
          action: `${apiUrl}/api/v1/channels/events`,
          params: { headers: { Authorization: `Basic ${apiKey}` } },
        },
        {
          type: 'status',
          action: `${apiUrl}/api/v1/social`,
          params: { headers: { Authorization: `Basic ${apiKey}` } },
        },
        {
          type: 'messageStatus',
          action: `${apiUrl}/api/v1/channels/messageStatus`,
          params: { headers: { Authorization: `Basic ${apiKey}` } },
        },
        {
          type: 'channelStatus',
          action: `${apiUrl}/api/v1/channels/status`,
          params: { headers: { Authorization: `Basic ${apiKey}` } },
        },
      ];

      // Get app credentials for Channel MS
      const appId = this.config.get<string>("WHATSAPP_APP_ID") || this.config.get<string>("FACEBOOK_APP_ID");
      const appSecret = this.config.get<string>("WHATSAPP_APP_SECRET") || this.config.get<string>("FACEBOOK_APP_SECRET");

      // Publish NATS message for channel MS to process with all required data
      await this.publishConnectionRegister({
        connectionId,
        companyId,
        shortLivedToken: tokenData.shortLivedToken,
        phoneNumberId: tokenData.phoneNumberId,
        wabaId: tokenData.wabaId,
        appId,
        appSecret,
        verifyToken: connection.verifyToken,
        displayName: tokenData.displayName,
        customChannelName: connection.displayName,
        webhooks,
      });

      this.logger.log(`Published connection register for ${connectionId}`);

      return {
        connectionId,
        companyId,
        status: ConnectionStatus.CODE_RECEIVED,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error creating WhatsApp connection: ${error.message}`);
      throw new HttpException(
        "Failed to create WhatsApp connection",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ================= IG OAuth (Core handles OAuth) =================
  async initInstagramConnection(dto: { companyId: string }): Promise<any> {
    const { companyId } = dto;

    // Create a pending connection (mirrors WA flow but channel=instagram)
    const connectionId = `ig_${companyId}_${Date.now()}`;
    const connection = new this.connModel({
      companyId,
      channel: 'instagram',
      connectionId,
      status: ConnectionStatus.PENDING,
      verifyToken: crypto.randomBytes(16).toString('hex'),
    });
    await connection.save();

    // Create signed state with HMAC like WA
    const stateData: StateData = { connectionId, companyId };
    const encodedData = Buffer.from(JSON.stringify(stateData)).toString('base64');
    const signature = signPayload(JSON.stringify(stateData), this.getStateSecret());
    const state = `${encodedData}.${signature}`;

    // Get redirect URI from config
    const redirectUri = this.config.get<string>('INSTAGRAM_REDIRECT_URI');
    if (!redirectUri) {
      throw new HttpException('Missing INSTAGRAM_REDIRECT_URI', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Build Instagram authorization URL
    const authUrl = this.buildInstagramAuthorizeUrl(state, redirectUri);

    return {
      success: true,
      companyId,
      connectionId,
      channel: 'instagram',
      status: ConnectionStatus.PENDING,
      authUrl,
    };
  }

  async createInstagramConnection(code: string, state: string): Promise<any> {
    try {
      // Decode and verify state
      const [encodedData, signature] = state.split('.');
      if (!encodedData || !signature) throw new Error('Invalid state format');
      const decodedData = Buffer.from(encodedData, 'base64').toString('utf8');
      if (!verifySignature(decodedData, signature, this.getStateSecret())) {
        throw new Error('Invalid state signature');
      }
      const stateData: StateData = JSON.parse(decodedData);
      const { connectionId, companyId } = stateData;

      // Find pending connection
      const connection = await this.connModel.findOne({ connectionId, companyId, channel: 'instagram', status: ConnectionStatus.PENDING });
      if (!connection) throw new HttpException('Connection not found or not pending', HttpStatus.NOT_FOUND);

      // Exchange code for short-lived token
      const appId = this.config.get<string>('INSTAGRAM_APP_ID') || this.config.get<string>('FACEBOOK_APP_ID');
      const appSecret = this.config.get<string>('INSTAGRAM_APP_SECRET') || this.config.get<string>('FACEBOOK_APP_SECRET');
      const redirectUri = this.config.get<string>('INSTAGRAM_REDIRECT_URI');
      if (!appId || !appSecret || !redirectUri) throw new HttpException('Missing Instagram/Facebook app configuration', HttpStatus.INTERNAL_SERVER_ERROR);

      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
      });
      const shortLivedToken = response?.data?.access_token;
      if (!shortLivedToken) throw new HttpException('No access token in response', HttpStatus.BAD_REQUEST);
      // Debug log with masked token
      const mask = (t: string) => (t ? `${t.substring(0, 6)}...${t.substring(t.length - 6)}` : 'null');
      this.logger.debug(`[IG OAuth] Received short-lived token: ${mask(shortLivedToken)}`);

      const longResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });
      const longLivedToken: string | undefined = longResp?.data?.access_token;
      if (longLivedToken) {
        this.logger.debug(`[IG OAuth] Received long-lived token: ${longLivedToken}`);
      } else {
        this.logger.warn('[IG OAuth] Could not retrieve long-lived token; proceeding with short-lived only');
      }

      // Update status
      connection.status = ConnectionStatus.CODE_RECEIVED;
      await connection.save();

      // Prepare webhooks (reuse WA style)
      const apiUrl = this.config.get<string>('CORE_PUBLIC_BASE_URL');
      const apiKey = connection.verifyToken;
      const webhooks = [
        { type: 'httpRequest', action: `${apiUrl}/api/v1/channels/events`, params: { headers: { Authorization: `Basic ${apiKey}` } } },
        { type: 'status', action: `${apiUrl}/api/v1/social`, params: { headers: { Authorization: `Basic ${apiKey}` } } },
        { type: 'messageStatus', action: `${apiUrl}/api/v1/channels/messageStatus`, params: { headers: { Authorization: `Basic ${apiKey}` } } },
        { type: 'channelStatus', action: `${apiUrl}/api/v1/channels/status`, params: { headers: { Authorization: `Basic ${apiKey}` } } },
      ];

      // Publish NATS for IG Channel to finalize connection
      this.logger.log(`[IG OAuth] Exchanging done. shortLivedToken length=${shortLivedToken?.length || 0}`);
      const registerPayload = {
        connectionId,
        companyId,
        shortLivedToken,
        longLivedToken,
        verifyToken: connection.verifyToken,
        webhooks,
      };
      this.logger.debug(`[IG OAuth] Publishing instagram.connection.register: ${JSON.stringify({ ...registerPayload, shortLivedToken: shortLivedToken ? '***' : null })}`);
      await this.bus.send('instagram.connection.register', registerPayload);

      return { success: true, connectionId, companyId, status: ConnectionStatus.CODE_RECEIVED };
    } catch (error) {
      this.logger.error(`Error creating Instagram connection: ${error.message}`);
      throw new HttpException('Failed to create Instagram connection', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  handleInstagramConnectionCreated(data: any) {
    try {
      const { companyId, connectionId: channelConnectionId, pageId, displayName } = data;
      this.connModel
        .findOne({ companyId, channel: 'instagram' })
        .sort({ createdAt: -1 })
        .then((connection) => {
          if (connection) {
            connection.status = ConnectionStatus.ACTIVE;
            if (displayName) connection.displayName = displayName;
            if (channelConnectionId) connection.connectionRefId = channelConnectionId;
            if (pageId) connection.pageId = pageId;
            connection.save();
            this.logger.log(`Instagram connection activated for company=${companyId}`);
          } else {
            this.logger.warn(`No pending Instagram connection found for company=${companyId}`);
          }
        });
    } catch (error) {
      this.logger.error(`Error handling Instagram connection created: ${error.message}`);
    }
  }

  handleInstagramConnectionFailed(data: any) {
    try {
      const { companyId, error } = data;
      this.connModel
        .findOne({ companyId, channel: 'instagram' })
        .sort({ createdAt: -1 })
        .then((connection) => {
          if (connection) {
            connection.status = ConnectionStatus.ERROR_CHANNEL;
            connection.save();
            this.logger.error(`Instagram connection failed for company=${companyId}: ${error}`);
          } else {
            this.logger.warn(`No pending Instagram connection found to mark failed for company=${companyId}`);
          }
        });
    } catch (error) {
      this.logger.error(`Error handling Instagram connection failed: ${error.message}`);
    }
  }

  async setActive(connectionId: string) {
    await this.connModel.updateOne({ connectionId }, { $set: { status: ConnectionStatus.ACTIVE } });
  }

  async setFailed(connectionId: string) {
    await this.connModel.updateOne({ connectionId }, { $set: { status: ConnectionStatus.ERROR_CHANNEL } });
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const tokenData = await this.exchangeCodeForTokenAndGetPhoneData(code);
    return tokenData.shortLivedToken;
  }

  private async exchangeCodeForTokenAndGetPhoneData(code: string): Promise<{
    shortLivedToken: string;
    phoneNumberId: string;
    wabaId: string;
    displayName: string;
  }> {
    // Prefer WhatsApp-specific credentials; fallback to Facebook ones
    const appId = this.config.get<string>("WHATSAPP_APP_ID") || this.config.get<string>("FACEBOOK_APP_ID");
    const appSecret = this.config.get<string>("WHATSAPP_APP_SECRET") || this.config.get<string>("FACEBOOK_APP_SECRET");
    const redirectUri = this.config.get<string>("FACEBOOK_REDIRECT_URI");

    if (!appId || !appSecret || !redirectUri) {
      throw new HttpException("Missing WhatsApp/Facebook app configuration", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // 1. Exchange code for short-lived token
      const tokenResponse = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code: code,
        },
      });

      if (!tokenResponse.data.access_token) {
        throw new Error("No access token in response");
      }

      const shortLivedToken = tokenResponse.data.access_token;
      this.logger.log('Successfully obtained short-lived token');

      // 2. Get WhatsApp Business Account info using debug_token
      const debugResponse = await axios.get(`https://graph.facebook.com/v18.0/debug_token`, {
        params: {
          input_token: shortLivedToken,
          access_token: `${appId}|${appSecret}`
        },
      });

      const debugData = debugResponse.data?.data;
      if (!debugData || !debugData.is_valid) {
        throw new Error('Invalid token received from Meta');
      }

      // 3. Exchange for long-lived token
      const longLivedResponse = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      const longLivedToken = longLivedResponse.data.access_token;
      this.logger.log('Successfully obtained long-lived token');

      // 4. Get app token for debug_token call
      const appTokenResponse = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
        params: {
          client_id: appId,
          client_secret: appSecret,
          grant_type: 'client_credentials',
        },
      });

      const appToken = appTokenResponse.data.access_token;

      // 5. Get debug token info to find WABA IDs
      const debugTokenResponse = await axios.get(`https://graph.facebook.com/v18.0/debug_token`, {
        params: {
          input_token: longLivedToken,
          access_token: appToken
        },
      });

      const debugTokenData = debugTokenResponse.data?.data;
      if (!debugTokenData || !debugTokenData.is_valid) {
        throw new Error('Invalid long-lived token');
      }

      // 6. Find WABA IDs from granular scopes
      const whatsappBusinessManagement: string[] = [];
      const whatsappBusinessMessaging: string[] = [];

      debugTokenData.granular_scopes?.forEach((granularScope: any) => {
        if (granularScope.scope === 'whatsapp_business_management') {
          whatsappBusinessManagement.push(...granularScope.target_ids);
        }
        if (granularScope.scope === 'whatsapp_business_messaging') {
          whatsappBusinessMessaging.push(...granularScope.target_ids);
        }
      });

      if (whatsappBusinessManagement.length === 0 || whatsappBusinessMessaging.length === 0) {
        throw new Error('WABA IDs not found in token scopes');
      }

      const wabaIds: string[] = whatsappBusinessManagement.filter((elem) =>
        whatsappBusinessMessaging.includes(elem),
      );

      if (wabaIds.length === 0) {
        throw new Error('No valid WABA IDs found');
      }

      // 7. Get phone numbers for the first WABA
      const wabaId = wabaIds[0];
      const phoneNumbersResponse = await axios.get(`https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`, {
        headers: {
          Authorization: `Bearer ${longLivedToken}`,
        },
      });

      if (!phoneNumbersResponse.data?.data || phoneNumbersResponse.data.data.length === 0) {
        throw new Error('Phone Numbers not found');
      }

      const phoneNumber = phoneNumbersResponse.data.data[0];
      
      return {
        shortLivedToken: longLivedToken, // Return long-lived token
        phoneNumberId: phoneNumber.id,
        wabaId: wabaId,
        displayName: phoneNumber.verified_name || phoneNumber.display_phone_number || 'WhatsApp Business'
      };
    } catch (error) {
      this.logger.error(`Token exchange or phone data fetch failed: ${error.message}`);
      throw new HttpException("Failed to get WhatsApp connection data", HttpStatus.BAD_REQUEST);
    }
  }

  private async publishConnectionRegister(data: any): Promise<void> {
    try {
      this.logger.log(`Sending connection register to ChannelMS: ${data.connectionId}`);
      await this.bus.sendConnectionRegister(data);
      this.logger.log(`Connection register event published for ${data.connectionId}`);
      this.logger.log(`Connection ${data.connectionId} will be processed asynchronously by ChannelMS`);
    } catch (error) {
      this.logger.error(`Failed to publish connection register: ${error.message}`);
      // Don't throw the error - let the connection creation continue
      // The connection will be marked as active when ChannelMS responds via NATS events
      this.logger.warn(`Connection ${data.connectionId} will be processed asynchronously`);
    }
  }

  handleConnectionCreated(data: any) {
    try {
      const { connectionId, companyId, phoneNumberId, displayName } = data;
      
      this.connModel.findOne({
        connectionId,
        companyId,
      }).then(connection => {
        if (connection) {
          connection.status = ConnectionStatus.ACTIVE;
          if (displayName) {
            connection.displayName = displayName;
          }
          if (phoneNumberId) {
            connection.phoneNumberId = phoneNumberId;
          }
          connection.save();
          
          this.logger.log(`Connection ${connectionId} activated successfully`);
        }
      });
    } catch (error) {
      this.logger.error(`Error handling connection created: ${error.message}`);
    }
  }

  handleConnectionFailed(data: any) {
    try {
      const { connectionId, companyId, error } = data;
      
      this.connModel.findOne({
        connectionId,
        companyId,
      }).then(connection => {
        if (connection) {
          connection.status = ConnectionStatus.ERROR_CHANNEL;
          connection.save();
          
          this.logger.error(`Connection ${connectionId} failed: ${error}`);
        }
      });
    } catch (error) {
      this.logger.error(`Error handling connection failed: ${error.message}`);
    }
  }

  async getConnectionsByCompany(companyId: string): Promise<Connection[]> {
    return this.connModel.find({ companyId }).exec();
  }

  async getConnectionById(connectionId: string): Promise<Connection | null> {
    return this.connModel.findOne({ connectionId }).exec();
  }

  async findByPhoneNumberId(phoneNumberId: string): Promise<Connection | null> {
    return this.connModel.findOne({ 
      phoneNumberId, 
      status: ConnectionStatus.ACTIVE 
    }).exec();
  }

  async resolveConnection(params: {
    companyId?: string;
    connectionId?: string;
    connectionRefId?: string;
    phoneNumberId?: string;
  }): Promise<Connection | null> {
    const { companyId, connectionId, connectionRefId, phoneNumberId } = params;
    
    // Try to find by connectionId first (most direct)
    if (connectionId) {
      const conn = await this.connModel.findOne({ 
        connectionId, 
        status: ConnectionStatus.ACTIVE 
      }).exec();
      if (conn) return conn;
    }
    
    // Try to find by phoneNumberId
    if (phoneNumberId) {
      const conn = await this.connModel.findOne({ 
        phoneNumberId, 
        status: ConnectionStatus.ACTIVE 
      }).exec();
      if (conn) return conn;
    }
    
    // Try to find by companyId (less specific)
    if (companyId) {
      const conn = await this.connModel.findOne({ 
        companyId, 
        status: ConnectionStatus.ACTIVE 
      }).exec();
      if (conn) return conn;
    }
    
    return null;
  }
}
