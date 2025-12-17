export interface NatsConnectionResponse {
  success: boolean;
  connection?: {
    connectionId: string;
    phoneId: string;
    displayName: string;
    webhooks: number;
  };
  error?: string;
}

export interface NatsMessageResponse {
  success: boolean;
  data?: any[];
  remoteIds?: string[];
  error?: string;
}

export interface NatsBaseResponse {
  success: boolean;
  error?: string;
}
