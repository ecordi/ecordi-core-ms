// NATS Event Contracts for Messaging System
// Core-MS publishes: core.messages.*
// Channel-MS publishes: channel.whatsapp.*, channel.email.*, etc.

export interface NatsMessagePayload {
  messageId: string;
  threadId?: string;
  companyId: string;
  channelType: string;
  connectionId: string;
  direction: 'inbound' | 'outbound';
  type: string;
  fromId: string;
  toId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface NatsInboundMessagePayload extends NatsMessagePayload {
  direction: 'inbound';
  externalMessageId?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaCaption?: string;
  fileName?: string;
  fileSize?: number;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  contactData?: Record<string, any>;
  replyToMessageId?: string;
  rawPayload?: Record<string, any>;
}

export interface NatsOutboundMessagePayload extends NatsMessagePayload {
  direction: 'outbound';
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaCaption?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParameters?: Record<string, any>;
  interactiveData?: Record<string, any>;
  replyToMessageId?: string;
}

export interface NatsMessageStatusPayload {
  messageId: string;
  externalMessageId?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface NatsThreadPayload {
  threadId: string;
  companyId: string;
  type: 'dm' | 'feed_comment';
  channelType: string;
  connectionId: string;
  externalUserId: string;
  subject?: string;
  feedPostId?: string;
  parentCommentId?: string;
  metadata?: Record<string, any>;
}

// NATS Response Interfaces
export interface NatsMessageResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
  details?: any;
}

export interface NatsThreadResponse {
  success: boolean;
  threadId?: string;
  error?: string;
  details?: any;
}

// NATS Subject Patterns
export const NATS_SUBJECTS = {
  // Core-MS publishes (outbound messages from core to channels)
  CORE_MESSAGE_SEND: 'core.messages.send',
  CORE_MESSAGE_STATUS_UPDATE: 'core.messages.status.update',
  
  // Channel-MS publishes (inbound messages from channels to core)
  CHANNEL_MESSAGE_RECEIVED: 'channel.{channelType}.message.received',
  CHANNEL_MESSAGE_STATUS: 'channel.{channelType}.message.status',
  CHANNEL_THREAD_CREATED: 'channel.{channelType}.thread.created',
  
  // Specific WhatsApp subjects
  WHATSAPP_MESSAGE_RECEIVED: 'channel.whatsapp.message.received',
  WHATSAPP_MESSAGE_STATUS: 'channel.whatsapp.message.status',
  WHATSAPP_THREAD_CREATED: 'channel.whatsapp.thread.created',
} as const;
