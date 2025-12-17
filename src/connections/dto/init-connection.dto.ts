import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConnectionProvider } from '../schemas/core-connection.schema';

export class InitConnectionDto {
  @ApiProperty({ description: 'Company ID' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: 'Connection provider', enum: ConnectionProvider })
  @IsEnum(ConnectionProvider)
  provider: ConnectionProvider;

  @ApiProperty({ description: 'WhatsApp Phone Number ID', required: false })
  @IsString()
  @IsOptional()
  phoneNumberId?: string;

  @ApiProperty({ description: 'WhatsApp Business Account ID', required: false })
  @IsString()
  @IsOptional()
  wabaId?: string;

  @ApiProperty({ description: 'Facebook App ID', required: false })
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiProperty({ description: 'Facebook App Secret', required: false })
  @IsString()
  @IsOptional()
  appSecret?: string;

  @ApiProperty({ description: 'Webhook Verify Token', required: false })
  @IsString()
  @IsOptional()
  verifyToken?: string;

  @ApiProperty({ description: 'Display Name for the connection', required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ description: 'Custom Channel Name', required: false })
  @IsString()
  @IsOptional()
  customChannelName?: string;

  @ApiProperty({ description: 'OAuth Redirect URI', required: false })
  @IsString()
  @IsOptional()
  redirectUri?: string;
}
