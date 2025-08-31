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

  private buildAuthorizeUrl(state: string, redirectUri: string): string {
    const appId = this.config.get<string>("FACEBOOK_APP_ID");
    if (!appId) {
      throw new HttpException("Missing FACEBOOK_APP_ID", HttpStatus.INTERNAL_SERVER_ERROR);
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

    // Build authorization URL
    const authUrl = this.buildAuthorizeUrl(state, redirectUri);

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

      // Exchange code for short-lived token
      const shortLivedToken = await this.exchangeCodeForToken(code);

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

      // Publish NATS message for channel MS to process
      await this.publishConnectionRegister({
        connectionId,
        companyId,
        shortLivedToken,
        verifyToken: connection.verifyToken,
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

  async setActive(connectionId: string) {
    await this.connModel.updateOne({ connectionId }, { $set: { status: ConnectionStatus.ACTIVE } });
  }

  async setFailed(connectionId: string) {
    await this.connModel.updateOne({ connectionId }, { $set: { status: ConnectionStatus.ERROR_CHANNEL } });
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const appId = this.config.get<string>("FACEBOOK_APP_ID");
    const appSecret = this.config.get<string>("FACEBOOK_APP_SECRET");
    const redirectUri = this.config.get<string>("FACEBOOK_REDIRECT_URI");

    if (!appId || !appSecret || !redirectUri) {
      throw new HttpException("Missing Facebook app configuration", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code: code,
        },
      });

      if (!response.data.access_token) {
        throw new Error("No access token in response");
      }

      return response.data.access_token;
    } catch (error) {
      this.logger.error(`Token exchange failed: ${error.message}`);
      throw new HttpException("Token exchange failed", HttpStatus.BAD_REQUEST);
    }
  }

  private async publishConnectionRegister(data: any): Promise<void> {
    try {
      this.logger.log(`Sending connection register to ChannelMS: ${data.connectionId}`);
      const result = await this.bus.sendConnectionRegister(data);
      this.logger.log(`ChannelMS response:`, result);
      
      if (result && result.success) {
        this.logger.log(`Connection ${data.connectionId} registered successfully in ChannelMS`);
      } else {
        this.logger.warn(`ChannelMS returned non-success response:`, result);
      }
    } catch (error) {
      this.logger.error(`Failed to send connection register: ${error.message}`);
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
