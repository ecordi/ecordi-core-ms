import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LinkedInConnection, LinkedInConnectionDocument } from './schemas/linkedin-connection.schema';
import { CreateLinkedInConnectionDto } from './dto/create-linkedin-connection.dto';

@Injectable()
export class LinkedInConnectionsService {
  private readonly logger = new Logger(LinkedInConnectionsService.name);
  private readonly linkedInApiUrl = 'https://api.linkedin.com/v2';
  private readonly linkedInAuthUrl = 'https://www.linkedin.com/oauth/v2';

  constructor(
    @InjectModel(LinkedInConnection.name)
    private linkedInConnectionModel: Model<LinkedInConnectionDocument>,
    private configService: ConfigService,
  ) {}

  async createConnection(createDto: CreateLinkedInConnectionDto): Promise<LinkedInConnection> {
    try {
      this.logger.log(`🔗 Creating LinkedIn connection for company: ${createDto.companyId}`);

      // Exchange authorization code for access token
      const tokenData = await this.exchangeCodeForToken(createDto.token, createDto.redirectUrl);
      
      // Get organization info using access token
      const organizationInfo = await this.getOrganizationInfo(tokenData.access_token);
      
      // Check if connection already exists
      const existingConnection = await this.linkedInConnectionModel.findOne({
        connectionId: organizationInfo.connectionId
      });

      if (existingConnection) {
        throw new ConflictException('LinkedIn connection already exists');
      }

      // Subscribe to organization events
      await this.subscribeToEvents(organizationInfo.memberId, organizationInfo.connectionId, tokenData.access_token);

      // Create new connection
      const connection = new this.linkedInConnectionModel({
        connectionId: organizationInfo.connectionId,
        companyId: createDto.companyId,
        displayName: organizationInfo.displayName,
        memberId: organizationInfo.memberId,
        pictureProfile: organizationInfo.pictureProfile,
        refreshToken: tokenData.refresh_token,
        refreshTokenExpiration: this.calculateExpiration(tokenData.refresh_token_expires_in),
        token: tokenData.access_token,
        tokenExpiration: this.calculateExpiration(tokenData.expires_in),
        userId: organizationInfo.userId,
        webhooks: createDto.webhooks || [],
        status: 'active'
      });

      const savedConnection = await connection.save();
      this.logger.log(`✅ LinkedIn connection created successfully: ${savedConnection.connectionId}`);
      
      return savedConnection;
    } catch (error) {
      this.logger.error(`❌ Error creating LinkedIn connection: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(companyId: string): Promise<LinkedInConnection[]> {
    return this.linkedInConnectionModel.find({ companyId }).exec();
  }

  async findOne(connectionId: string): Promise<LinkedInConnection> {
    const connection = await this.linkedInConnectionModel.findOne({ connectionId }).exec();
    if (!connection) {
      throw new NotFoundException(`LinkedIn connection ${connectionId} not found`);
    }
    return connection;
  }

  async updateConnection(connectionId: string, updateData: Partial<LinkedInConnection>): Promise<LinkedInConnection> {
    const connection = await this.linkedInConnectionModel.findOneAndUpdate(
      { connectionId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).exec();

    if (!connection) {
      throw new NotFoundException(`LinkedIn connection ${connectionId} not found`);
    }

    return connection;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const result = await this.linkedInConnectionModel.deleteOne({ connectionId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`LinkedIn connection ${connectionId} not found`);
    }
    this.logger.log(`🗑️ LinkedIn connection deleted: ${connectionId}`);
  }

  async refreshToken(connectionId: string): Promise<LinkedInConnection> {
    const connection = await this.findOne(connectionId);
    
    try {
      const tokenData = await this.exchangeCodeForToken(connection.refreshToken, null, 'refresh_token');
      
      const updatedConnection = await this.updateConnection(connectionId, {
        token: tokenData.access_token,
        tokenExpiration: this.calculateExpiration(tokenData.expires_in),
        refreshToken: tokenData.refresh_token,
        refreshTokenExpiration: this.calculateExpiration(tokenData.refresh_token_expires_in),
      });

      this.logger.log(`🔄 LinkedIn token refreshed for connection: ${connectionId}`);
      return updatedConnection;
    } catch (error) {
      this.logger.error(`❌ Error refreshing LinkedIn token: ${error.message}`);
      throw error;
    }
  }

  private async exchangeCodeForToken(code: string, redirectUrl: string, grantType = 'authorization_code'): Promise<any> {
    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = this.configService.get<string>('LINKEDIN_CLIENT_SECRET');

    const params = new URLSearchParams();
    params.append('grant_type', grantType);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    
    if (grantType === 'authorization_code') {
      params.append('code', code);
      params.append('redirect_uri', redirectUrl);
    } else {
      params.append('refresh_token', code);
    }

    const response = await axios.post(`${this.linkedInAuthUrl}/accessToken`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  }

  private async getOrganizationInfo(accessToken: string): Promise<any> {
    const response = await axios.get(`${this.linkedInApiUrl}/organizationAcls?q=roleAssignee&projection=(elements*(organization~(id,vanityName,localizedName,logoV2),roleAssignee~(id)))`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const element = response.data.elements[0];
    const organization = element['organization~'];
    const roleAssignee = element['roleAssignee~'];

    const picturesProfiles = organization.logoV2?.['original~']?.elements || [];
    const pictureProfile = picturesProfiles[picturesProfiles.length - 1]?.identifiers?.[0]?.identifier || null;

    return {
      connectionId: organization.id,
      displayName: organization.localizedName,
      userId: organization.vanityName,
      memberId: roleAssignee.id,
      pictureProfile,
    };
  }

  private async subscribeToEvents(memberId: string, connectionId: string, accessToken: string): Promise<void> {
    const eventSubscriptionData = {
      eventType: 'ORGANIZATION_SOCIAL_ACTION_NOTIFICATIONS',
      memberId,
      connectionId,
    };

    await axios.post(`${this.linkedInApiUrl}/eventSubscriptions`, eventSubscriptionData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`📡 Subscribed to LinkedIn events for connection: ${connectionId}`);
  }

  private calculateExpiration(expiresIn: number): string {
    const expirationDate = new Date(Date.now() + expiresIn * 1000);
    return expirationDate.toISOString();
  }
}
