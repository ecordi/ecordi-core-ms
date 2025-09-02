import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { connect, NatsConnection, JetStreamManager } from 'nats';

@Injectable()
export class JetStreamConfig implements OnModuleInit {
  private readonly logger = new Logger(JetStreamConfig.name);
  private natsConnection: NatsConnection;
  private jsm: JetStreamManager;

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      this.natsConnection = await connect({
        servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
      });

      this.jsm = await this.natsConnection.jetstreamManager();
      
      await this.createStreams();
      // Consumers will be created automatically by the consumer services
      
      this.logger.log('JetStream configuration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize JetStream configuration:', error);
      throw error;
    }
  }

  private async createStreams(): Promise<void> {
    const streams: any[] = [
      {
        name: 'CHANNEL_EVENTS',
        subjects: ['channels.*.events.*'],
        retention: 'limits',
        max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
        max_msgs: 1000000,
        max_bytes: 1024 * 1024 * 1024, // 1GB
        storage: 'file',
        replicas: 1,
        discard: 'old',
        duplicate_window: 2 * 60 * 1000000000, // 2 minutes in nanoseconds
      },
      {
        name: 'CHANNEL_EVENTS_DLQ',
        subjects: ['channels.*.events.*.dlq'],
        retention: 'limits',
        max_age: 30 * 24 * 60 * 60 * 1000000000, // 30 days in nanoseconds
        max_msgs: 100000,
        storage: 'file',
        replicas: 1,
        discard: 'old',
      },
      {
        name: 'REALTIME_EVENTS',
        subjects: ['realtime.*'],
        retention: 'limits',
        max_age: 1 * 60 * 60 * 1000000000, // 1 hour in nanoseconds
        max_msgs: 100000,

        replicas: 1,
        discard: 'old',
      }
    ];

    for (const streamConfig of streams) {
      try {
        await this.jsm.streams.add(streamConfig);
        this.logger.log(`Created stream: ${streamConfig.name}`);
      } catch (error) {
        if (error.message.includes('stream name already in use')) {
          this.logger.debug(`Stream ${streamConfig.name} already exists`);
          // Update existing stream
          await this.jsm.streams.update(streamConfig.name, streamConfig);
        } else {
          this.logger.error(`Failed to create stream ${streamConfig.name}:`, error);
          throw error;
        }
      }
    }
  }


  async getConnection(): Promise<NatsConnection> {
    return this.natsConnection;
  }

  async close(): Promise<void> {
    if (this.natsConnection) {
      await this.natsConnection.close();
      this.logger.log('JetStream connection closed');
    }
  }
}
