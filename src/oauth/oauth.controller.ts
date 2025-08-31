import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OauthService } from './oauth.service';

@ApiTags('OAuth')
@Controller('oauth')
export class OauthController {
  constructor(private readonly oauth: OauthService) {}

  @Get('facebook')
  @ApiOperation({ summary: 'Start Facebook OAuth', description: 'Proxies to WhatsApp Cloud MS to get the auth URL and stores the state for callback validation.' })
  @ApiQuery({ name: 'companyId', required: false })
  async startFacebook(@Query('companyId') companyId?: string) {
    const { url, state } = await this.oauth.startFacebook(companyId);
    return { url, state };
  }

  @Get('facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback', description: 'Validates stored state and completes OAuth by calling WhatsApp Cloud MS callback with Cookie header.' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  async facebookCallback(@Query('code') code: string, @Query('state') state: string) {
    return this.oauth.completeFacebook(code, state);
  }
}
