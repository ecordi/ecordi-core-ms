export interface WhatsAppConnectionRegisterPayload {
  connectionId: string;
  companyId: string;
  phoneNumberId: string;
  wabaId: string;
  appId: string;
  appSecret: string;
  shortLivedToken: string;
  shortLivedExpiresIn: number;
  verifyToken: string;
  displayName: string;
  customChannelName: string;
}

export interface WhatsAppConnectionCreatedPayload {
  connectionId: string;
  companyId: string;
  phoneNumberId: string;
  wabaId: string;
  status: 'active';
  provider: 'whatsapp_cloud';
}

export interface WhatsAppConnectionFailedPayload {
  connectionId: string;
  companyId: string;
  error: string;
  details: string;
  httpStatus: number;
}

export interface OAuthStatePayload {
  connectionId: string;
  companyId: string;
  phoneNumberId: string;
  wabaId: string;
  verifyToken: string;
  displayName: string;
  customChannelName: string;
}

export interface InstagramConnectionCreatedPayload {
  connectionId: string;    // IG business account id
  companyId: string;
  pageId: string;          // Facebook page ID
  displayName: string;
  tokenPage: string;       // Page access token
  createdAt: string;
  channel: 'instagram';
  type: 'connection.created';
}

export interface InstagramConnectionFailedPayload {
  channel: 'instagram';
  type: 'connection.failed';
  error: string;
  at: string;
  companyId?: string;
}
