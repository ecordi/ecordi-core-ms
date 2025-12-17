import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OauthService } from './oauth.service';

@ApiTags('OAuth')
@Controller('oauth')
export class OauthController {
  constructor(private readonly oauth: OauthService) {}

  @Get('facebook')
  @ApiOperation({ summary: 'Start Facebook OAuth', description: 'Proxies to WA Channel MS to get the auth URL and stores the state for callback validation.' })
  async startFacebook() {
    const { url, state } = await this.oauth.startFacebook();
    return { url, state };
  }

  @Get('facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback', description: 'Validates stored state and completes OAuth by calling WA Channel MS callback with Cookie header.' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  async facebookCallback(@Query('code') code: string, @Query('state') state: string) {
    return this.oauth.completeFacebook(code, state);
  }

  @Get('instagram')
  @ApiOperation({ summary: 'Start Instagram OAuth', description: 'Proxies to Instagram Channel MS to get the auth URL and stores the state for callback validation.' })
  @ApiQuery({ name: 'companyId', required: false })
  async startInstagram(@Query('companyId') companyId?: string) {
    const { url, state } = await this.oauth.startInstagram(companyId);
    return { url, state };
  }

  @Get('instagram/callback')
  @ApiOperation({ summary: 'Instagram OAuth callback', description: 'Validates stored state and completes OAuth by calling Instagram Channel MS callback.' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  async instagramCallback(@Query('code') code: string, @Query('state') state: string) {
    return this.oauth.completeInstagram(code, state);
  }
}
