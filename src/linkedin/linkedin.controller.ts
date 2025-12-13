import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LinkedInService } from './linkedin.service';
import { CreateLinkedInPostDto } from './dto/create-linkedin-post.dto';
import { StrictValidationPipe } from '../common/validation.pipe';
// import { AuthGuard } from '@nestjs/passport'; // Uncomment when auth is ready

@ApiTags('LinkedIn Posts')
@Controller('api/v1/core/linkedin')
// @UseGuards(AuthGuard('jwt')) // Uncomment when auth is ready
export class LinkedInController {
  constructor(private readonly linkedInService: LinkedInService) {}

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create LinkedIn post',
    description: 'Creates and publishes a new LinkedIn post (feed post or comment) through the LinkedIn API'
  })
  @ApiBody({ type: CreateLinkedInPostDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'LinkedIn post created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        post: {
          type: 'object',
          properties: {
            postId: { type: 'string', example: 'linkedin_post_1234567890_abc123' },
            connectionId: { type: 'string', example: '12345678' },
            companyId: { type: 'string', example: 'company-123' },
            type: { type: 'string', enum: ['FEED', 'COMMENT'] },
            content: { type: 'string', example: 'This is a LinkedIn post content' },
            status: { type: 'string', example: 'pending' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid post data' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'LinkedIn connection not found' })
  async createPost(@Body(new StrictValidationPipe()) createPostDto: CreateLinkedInPostDto) {
    const post = await this.linkedInService.createPost(createPostDto);
    return { success: true, post };
  }

  @Get('posts/connection/:connectionId')
  @ApiOperation({ 
    summary: 'Get posts by connection',
    description: 'Retrieves LinkedIn posts for a specific connection'
  })
  @ApiParam({ name: 'connectionId', description: 'LinkedIn connection ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of posts to return', example: 50 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              postId: { type: 'string' },
              type: { type: 'string' },
              content: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              sentAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  async getPostsByConnection(
    @Param('connectionId') connectionId: string,
    @Query('limit') limit?: number
  ) {
    const posts = await this.linkedInService.findPostsByConnection(
      connectionId, 
      limit ? parseInt(limit.toString()) : 50
    );
    return { success: true, posts };
  }

  @Get('posts/company/:companyId')
  @ApiOperation({ 
    summary: 'Get posts by company',
    description: 'Retrieves LinkedIn posts for all connections of a specific company'
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of posts to return', example: 50 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Posts retrieved successfully' 
  })
  async getPostsByCompany(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: number
  ) {
    const posts = await this.linkedInService.findPostsByCompany(
      companyId, 
      limit ? parseInt(limit.toString()) : 50
    );
    return { success: true, posts };
  }
}
