import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { createHmac, randomBytes } from 'crypto';
import axios from 'axios';
import { CoreConnection, CoreConnectionDocument, ConnectionStatus, ConnectionProvider } from './schemas/core-connection.schema';
import { InitConnectionDto } from './dto/init-connection.dto';
import { ConnectionResponseDto, OAuthCallbackResponseDto } from './dto/connection-response.dto';
import { 
  WhatsAppConnectionRegisterPayload, 
  WhatsAppConnectionCreatedPayload, 
  WhatsAppConnectionFailedPayload,
  InstagramConnectionCreatedPayload,
  InstagramConnectionFailedPayload,
  OAuthStatePayload 
} from './interfaces/nats-payloads.interface';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    @InjectModel(CoreConnection.name)
    private coreConnectionModel: Model<CoreConnectionDocument>,
    private configService: ConfigService,
    @Inject('NATS_SERVICE') private natsClient: ClientProxy,
  ) {}

  async initConnection(initDto: InitConnectionDto): Promise<ConnectionResponseDto> {
    try {
      const connectionId = this.generateConnectionId();
      const state = this.generateState({
        connectionId,
        companyId: initDto.companyId,
        phoneNumberId: initDto.phoneNumberId || '',
        wabaId: initDto.wabaId || '',
        verifyToken: initDto.verifyToken || '',
        displayName: initDto.displayName || '',
        customChannelName: initDto.customChannelName || ''
      });

      const stateHmac = this.generateStateHmac(state, initDto.appSecret || '');

      // Create core connection
      const connection = new this.coreConnectionModel({
        connectionId,
        companyId: initDto.companyId,
        provider: initDto.provider,
        status: ConnectionStatus.PENDING,
        phoneNumberId: initDto.phoneNumberId,
        wabaId: initDto.wabaId,
        appId: initDto.appId,
        appSecret: initDto.appSecret,
        verifyToken: initDto.verifyToken,
        displayName: initDto.displayName,
        customChannelName: initDto.customChannelName,
        redirectUri: initDto.redirectUri || this.getDefaultRedirectUri(),
        state,
        stateHmac
      });

      await connection.save();

      // Generate OAuth URL
      const authUrl = this.generateOAuthUrl(initDto.appId || '', initDto.redirectUri || this.getDefaultRedirectUri(), state);

      return {
        connectionId,
        companyId: initDto.companyId,
        provider: initDto.provider,
        status: ConnectionStatus.PENDING,
        authUrl,
        success: true
      };

    } catch (error) {
      this.logger.error('Error initializing connection:', error);
      throw error;
    }
  }

  async handleOAuthCallback(code: string, state: string): Promise<OAuthCallbackResponseDto> {
    try {
      // Decode and validate state
      const stateData = this.decodeState(state);
      if (!stateData) {
        return {
          success: false,
          status: ConnectionStatus.ERROR_OAUTH,
          error: 'Invalid state parameter'
        };
      }

      // Find connection
      const connection = await this.coreConnectionModel.findOne({
        connectionId: stateData.connectionId
      });

      if (!connection) {
        return {
          success: false,
          status: ConnectionStatus.ERROR_OAUTH,
          error: 'Connection not found'
        };
      }

      // Validate HMAC
      const expectedHmac = this.generateStateHmac(state, connection.appSecret || '');
      if (connection.stateHmac !== expectedHmac) {
        await this.updateConnectionStatus(connection.connectionId, ConnectionStatus.ERROR_OAUTH, 'Invalid state HMAC');
        return {
          success: false,
          status: ConnectionStatus.ERROR_OAUTH,
          error: 'Invalid state signature'
        };
      }

      // Exchange code for short-lived token
      const tokenResponse = await this.exchangeCodeForToken(code, connection);
      console.log("🚀 ~ file: connections.service.ts:120 ~ tokenResponse:", tokenResponse)
      if (!tokenResponse.success) {
        await this.updateConnectionStatus(connection.connectionId, ConnectionStatus.ERROR_OAUTH, tokenResponse.error);
        return {
          success: false,
          status: ConnectionStatus.ERROR_OAUTH,
          error: tokenResponse.error
        };
      }

      // Update connection with short-lived token
      await this.coreConnectionModel.updateOne(
        { connectionId: connection.connectionId },
        {
          status: ConnectionStatus.CODE_RECEIVED,
          shortLivedToken: tokenResponse.access_token,
          shortLivedExpiresIn: tokenResponse.expires_in
        }
      );

      // Publish to NATS for channel processing
      await this.publishConnectionRegister(connection, tokenResponse.access_token, tokenResponse.expires_in);

      return {
        success: true,
        status: ConnectionStatus.CODE_RECEIVED,
        connectionId: connection.connectionId
      };

    } catch (error) {
      this.logger.error('Error handling OAuth callback:', error);
      return {
        success: false,
        status: ConnectionStatus.ERROR_OAUTH,
        error: 'Internal server error'
      };
    }
  }

  async handleConnectionCreated(payload: WhatsAppConnectionCreatedPayload): Promise<void> {
    try {
      await this.coreConnectionModel.updateOne(
        { connectionId: payload.connectionId },
        { status: ConnectionStatus.ACTIVE }
      );
      this.logger.log(`Connection ${payload.connectionId} marked as active`);
    } catch (error) {
      this.logger.error('Error handling connection created:', error);
    }
  }

  async handleConnectionFailed(payload: WhatsAppConnectionFailedPayload): Promise<void> {
    try {
      await this.coreConnectionModel.updateOne(
        { connectionId: payload.connectionId },
        {
          status: ConnectionStatus.ERROR_CHANNEL,
          errorMessage: payload.error,
          errorDetails: payload.details,
          lastErrorAt: new Date()
        }
      );
      this.logger.error(`Connection ${payload.connectionId} failed: ${payload.error}`);
    } catch (error) {
      this.logger.error('Error handling connection failed:', error);
    }
  }

  private generateConnectionId(): string {
    return `conn_${randomBytes(8).toString('hex')}`;
  }

  private generateState(payload: OAuthStatePayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private decodeState(state: string): OAuthStatePayload | null {
    try {
      return JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return null;
    }
  }

  private generateStateHmac(state: string, appSecret: string): string {
    return createHmac('sha256', appSecret).update(state).digest('hex');
  }

  private generateOAuthUrl(appId: string, redirectUri: string, state: string): string {
    const baseUrl = 'https://www.facebook.com/v19.0/dialog/oauth';
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: 'whatsapp_business_management,whatsapp_business_messaging'
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private getDefaultRedirectUri(): string {
    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    return `${baseUrl}/auth/facebook/callback`;
  }

  private async exchangeCodeForToken(code: string, connection: CoreConnectionDocument): Promise<any> {
    try {
      const META_GRAPH_VERSION = this.configService.get<string>('META_GRAPH_VERSION');
      const response = await axios.get(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`, {
        params: {
          client_id: connection.appId,
          client_secret: connection.appSecret,
          redirect_uri: connection.redirectUri,
          code
        }
      });
      console.log("🚀 ~ file: connections.service.ts:227 ~ response:", response)

      return {
        success: true,
        access_token: response.data.access_token,
        expires_in: response.data.expires_in
      };
    } catch (error: any) {
      this.logger.error('Error exchanging code for token:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Token exchange failed'
      };
    }
  }

  private async publishConnectionRegister(connection: CoreConnectionDocument, shortLivedToken: string, expiresIn: number): Promise<void> {
    const payload: WhatsAppConnectionRegisterPayload = {
      connectionId: connection.connectionId,
      companyId: connection.companyId,
      phoneNumberId: connection.phoneNumberId || '',
      wabaId: connection.wabaId || '',
      appId: connection.appId || '',
      appSecret: connection.appSecret || '',
      shortLivedToken,
      shortLivedExpiresIn: expiresIn,
      verifyToken: connection.verifyToken || '',
      displayName: connection.displayName || '',
      customChannelName: connection.customChannelName || ''
    };

    this.natsClient.emit('whatsapp.connection.register', payload);
    this.logger.log(`Published connection register for ${connection.connectionId}`);
  }

  private async updateConnectionStatus(connectionId: string, status: ConnectionStatus, error?: string): Promise<void> {
    const updateData: any = { status };
    if (error) {
      updateData.errorMessage = error;
      updateData.lastErrorAt = new Date();
    }

    await this.coreConnectionModel.updateOne({ connectionId }, updateData);
  }

  async getConnectionStatus(connectionId: string): Promise<CoreConnectionDocument | null> {
    return this.coreConnectionModel.findOne({ connectionId });
  }

  async getConnectionsByCompany(companyId: string): Promise<CoreConnectionDocument[]> {
    return this.coreConnectionModel.find({ companyId });
  }

  async handleInstagramConnectionCreated(payload: InstagramConnectionCreatedPayload): Promise<void> {
    try {
      // Buscar si existe una conexión pendiente para esta compañía
      const existingConnection = await this.coreConnectionModel.findOne({
        companyId: payload.companyId,
        provider: ConnectionProvider.INSTAGRAM,
        status: { $in: [ConnectionStatus.PENDING, ConnectionStatus.CODE_RECEIVED] }
      });

      if (existingConnection) {
        // Actualizar la conexión existente
        existingConnection.connectionId = payload.connectionId;
        existingConnection.status = ConnectionStatus.ACTIVE;
        existingConnection.displayName = payload.displayName;
        existingConnection.metadata = {
          pageId: payload.pageId,
          tokenPage: payload.tokenPage, // Considerar encriptar este token
          createdAt: payload.createdAt
        };
        existingConnection.updatedAt = new Date();
        await existingConnection.save();
        
        this.logger.log(`Instagram connection ${payload.connectionId} activated for company ${payload.companyId}`);
      } else {
        // Crear una nueva conexión si no existe una pendiente
        await this.coreConnectionModel.create({
          connectionId: payload.connectionId,
          companyId: payload.companyId,
          provider: ConnectionProvider.INSTAGRAM,
          status: ConnectionStatus.ACTIVE,
          displayName: payload.displayName,
          metadata: {
            pageId: payload.pageId,
            tokenPage: payload.tokenPage,
            createdAt: payload.createdAt
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        this.logger.log(`New Instagram connection ${payload.connectionId} created for company ${payload.companyId}`);
      }
    } catch (error) {
      this.logger.error(`Error handling Instagram connection created: ${error.message}`, error.stack);
      throw error;
    }
  }

  async handleInstagramConnectionFailed(payload: InstagramConnectionFailedPayload): Promise<void> {
    try {
      if (!payload.companyId) {
        this.logger.warn(`Instagram connection failed without companyId: ${payload.error}`);
        return;
      }
      
      // Buscar conexión pendiente para esta compañía
      const existingConnection = await this.coreConnectionModel.findOne({
        companyId: payload.companyId,
        provider: ConnectionProvider.INSTAGRAM,
        status: { $in: [ConnectionStatus.PENDING, ConnectionStatus.CODE_RECEIVED] }
      });
      
      if (existingConnection) {
        existingConnection.status = ConnectionStatus.ERROR_OAUTH;
        existingConnection.errorMessage = payload.error;
        existingConnection.lastErrorAt = new Date();
        existingConnection.updatedAt = new Date();
        await existingConnection.save();
        
        this.logger.log(`Instagram connection for company ${payload.companyId} marked as failed: ${payload.error}`);
      } else {
        this.logger.warn(`No pending Instagram connection found for company ${payload.companyId}`);
      }
    } catch (error) {
      this.logger.error(`Error handling Instagram connection failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createPendingInstagramConnection(data: {
    connectionId: string;
    companyId: string;
    displayName: string;
  }): Promise<CoreConnectionDocument> {
    const connection = new this.coreConnectionModel({
      connectionId: data.connectionId,
      companyId: data.companyId,
      provider: ConnectionProvider.INSTAGRAM,
      status: ConnectionStatus.PENDING,
      displayName: data.displayName,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return connection.save();
  }
}
