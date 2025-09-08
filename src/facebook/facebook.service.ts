import { Injectable } from '@nestjs/common';
import { NatsTransportService } from '../transports/nats-transport.service';
import { SendFacebookMessageDto } from './dto/send-facebook-message.dto';
import { FacebookRegisterDto } from './dto/facebook-register.dto';
import { FacebookFeedDto } from './dto/facebook-feed.dto';
import { FacebookCommentDto } from './dto/facebook-comment.dto';

export interface FacebookMessageResponse {
  success: boolean;
  remoteIds?: string[];
  error?: string;
}

export interface FacebookGenericResponse {
  success: boolean;
  created?: boolean;
  updated?: boolean;
  deleted?: boolean;
  data?: any;
  error?: string;
}

export interface FacebookRegisterResponse {
  success: boolean;
  connection?: any;
  error?: string;
}

@Injectable()
export class FacebookService {
  constructor(private readonly nats: NatsTransportService) {}

  sendMessages(dto: SendFacebookMessageDto): Promise<FacebookMessageResponse> {
    return this.nats.sendFacebookMessage<FacebookMessageResponse>(dto);
  }

  register(dto: FacebookRegisterDto): Promise<FacebookRegisterResponse> {
    return this.nats.registerFacebookConnection<FacebookRegisterResponse>(dto);
  }

  publishFeed(dto: FacebookFeedDto): Promise<FacebookGenericResponse> {
    return this.nats.publishFacebookFeed<FacebookGenericResponse>(dto);
  }

  publishComment(dto: FacebookCommentDto): Promise<FacebookGenericResponse> {
    return this.nats.publishFacebookComment<FacebookGenericResponse>(dto);
  }
}
