import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LinkedInPost, LinkedInPostDocument } from './schemas/linkedin-post.schema';
import { CreateLinkedInPostDto } from './dto/create-linkedin-post.dto';
import { LinkedInConnectionsService } from './linkedin-connections.service';

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);
  private readonly linkedInApiUrl = 'https://api.linkedin.com/v2';

  constructor(
    @InjectModel(LinkedInPost.name)
    private linkedInPostModel: Model<LinkedInPostDocument>,
    private linkedInConnectionsService: LinkedInConnectionsService,
    private configService: ConfigService,
  ) {}

  async createPost(createPostDto: CreateLinkedInPostDto): Promise<LinkedInPost> {
    try {
      this.logger.log(`📝 Creating LinkedIn post for connection: ${createPostDto.connectionId}`);

      // Get connection details
      const connection = await this.linkedInConnectionsService.findOne(createPostDto.connectionId);

      // Create post record
      const post = new this.linkedInPostModel({
        postId: this.generatePostId(),
        connectionId: createPostDto.connectionId,
        companyId: createPostDto.companyId,
        type: createPostDto.type,
        content: createPostDto.content,
        mediaUrl: createPostDto.mediaUrl,
        mediaType: createPostDto.mediaType,
        parentPostId: createPostDto.parentPostId,
        scheduledAt: createPostDto.scheduledAt ? new Date(createPostDto.scheduledAt) : new Date(),
        status: 'pending',
      });

      const savedPost = await post.save();

      // Send post to LinkedIn API
      await this.publishToLinkedIn(savedPost, connection);

      this.logger.log(`✅ LinkedIn post created successfully: ${savedPost.postId}`);
      return savedPost;
    } catch (error) {
      this.logger.error(`❌ Error creating LinkedIn post: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findPostsByConnection(connectionId: string, limit = 50): Promise<LinkedInPost[]> {
    return this.linkedInPostModel
      .find({ connectionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findPostsByCompany(companyId: string, limit = 50): Promise<LinkedInPost[]> {
    return this.linkedInPostModel
      .find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async updatePostStatus(postId: string, status: string, linkedInResponse?: any, errorMessage?: string): Promise<LinkedInPost> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    }

    if (linkedInResponse) {
      updateData.linkedInResponse = linkedInResponse;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return this.linkedInPostModel.findOneAndUpdate(
      { postId },
      updateData,
      { new: true }
    ).exec();
  }

  private async publishToLinkedIn(post: LinkedInPost, connection: any): Promise<void> {
    try {
      let response;

      if (post.type === 'FEED') {
        response = await this.createFeedPost(post, connection);
      } else if (post.type === 'COMMENT') {
        response = await this.createComment(post, connection);
      } else {
        throw new Error(`Unsupported post type: ${post.type}`);
      }

      await this.updatePostStatus(post.postId, 'sent', response.data);
      this.logger.log(`📤 LinkedIn post published successfully: ${post.postId}`);
    } catch (error) {
      await this.updatePostStatus(post.postId, 'failed', null, error.message);
      this.logger.error(`❌ Error publishing to LinkedIn: ${error.message}`);
      throw error;
    }
  }

  private async createFeedPost(post: LinkedInPost, connection: any): Promise<any> {
    const postData = {
      author: `urn:li:organization:${connection.connectionId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.content
          },
          shareMediaCategory: post.mediaUrl ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    // Add media if present
    if (post.mediaUrl) {
      (postData.specificContent['com.linkedin.ugc.ShareContent'] as any).media = [{
        status: 'READY',
        description: {
          text: post.content
        },
        media: post.mediaUrl,
        title: {
          text: 'Shared content'
        }
      }];
    }

    return axios.post(`${this.linkedInApiUrl}/ugcPosts`, postData, {
      headers: {
        'Authorization': `Bearer ${connection.token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
  }

  private async createComment(post: LinkedInPost, connection: any): Promise<any> {
    if (!post.parentPostId) {
      throw new Error('Parent post ID is required for comments');
    }

    const commentData = {
      actor: `urn:li:organization:${connection.connectionId}`,
      object: post.parentPostId,
      message: {
        text: post.content
      }
    };

    return axios.post(`${this.linkedInApiUrl}/socialActions/${post.parentPostId}/comments`, commentData, {
      headers: {
        'Authorization': `Bearer ${connection.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private generatePostId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `linkedin_post_${timestamp}_${random}`;
  }
}
