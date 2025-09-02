import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Broadcast new message to clients subscribed to a task
  broadcastMessage(taskId: string, message: any) {
    this.server.to(`task:${taskId}`).emit('message.created', message);
  }

  // Broadcast message status update
  broadcastMessageUpdate(taskId: string, messageId: string, status: string) {
    this.server.to(`task:${taskId}`).emit('message.updated', {
      messageId,
      status,
    });
  }

  // Broadcast internal note (only to staff)
  broadcastInternalNote(taskId: string, note: any) {
    this.server.to(`task:${taskId}:staff`).emit('internal.note.created', note);
  }
}