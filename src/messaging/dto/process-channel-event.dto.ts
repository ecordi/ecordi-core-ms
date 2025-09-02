import { IsString, IsOptional, IsNumber, IsArray, IsIn, IsObject } from 'class-validator';

export class IncomingMediaDto {
  @IsString()
  mediaId: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  sha256?: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  url?: string;
}

export class ProcessChannelEventDto {
  @IsString()
  channel: string;

  @IsIn(['incoming','outgoing'])
  direction: 'incoming' | 'outgoing';

  @IsString()
  companyId: string;

  @IsString()
  connectionId: string;

  @IsString()
  senderId: string;

  @IsString()
  recipientId: string;

  @IsOptional()
  @IsString()
  remoteId?: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  media?: IncomingMediaDto[];

  @IsOptional()
  @IsObject()
  providerRaw?: any;
}

export class CreateInternalNoteDto {
  @IsString()
  companyId: string;

  @IsString()
  taskId: string;

  @IsString()
  userId: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  media?: IncomingMediaDto[];
}

export class SendOutboundMessageDto {
  @IsString()
  companyId: string;

  @IsString()
  taskId: string;

  @IsString()
  type: string;

  @IsString()
  body: string;

  @IsString()
  recipientId: string;

  @IsOptional()
  @IsArray()
  media?: IncomingMediaDto[];
}