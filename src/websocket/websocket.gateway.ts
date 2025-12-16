import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/messaging',
})
export class MessagingWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingWebSocketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-company')
  handleJoinCompany(
    @MessageBody() data: { companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `company:${data.companyId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined company room: ${room}`);
    client.emit('joined-company', { companyId: data.companyId });
  }

  @SubscribeMessage('leave-company')
  handleLeaveCompany(
    @MessageBody() data: { companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `company:${data.companyId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left company room: ${room}`);
  }

  // Emit message created event to company room
  emitMessageCreated(companyId: string, message: any) {
    const room = `company:${companyId}`;
    this.server.to(room).emit('message.created', message);
    this.logger.log(`Emitted message.created to room: ${room}`);
  }

  // Emit message updated event to company room
  emitMessageUpdated(companyId: string, message: any) {
    const room = `company:${companyId}`;
    this.server.to(room).emit('message.updated', message);
    this.logger.log(`Emitted message.updated to room: ${room}`);
  }

  // Emit thread created event to company room
  emitThreadCreated(companyId: string, thread: any) {
    const room = `company:${companyId}`;
    this.server.to(room).emit('thread.created', thread);
    this.logger.log(`Emitted thread.created to room: ${room}`);
  }

  // Emit thread updated event to company room
  emitThreadUpdated(companyId: string, thread: any) {
    const room = `company:${companyId}`;
    this.server.to(room).emit('thread.updated', thread);
    this.logger.log(`Emitted thread.updated to room: ${room}`);
  }

  // Emit task message created event to task-specific room
  emitTaskMessageCreated(taskId: string, message: any) {
    const room = `task:${taskId}`;
    this.server.to(room).emit('task.message.created', message);
    this.logger.log(`Emitted task.message.created to room: ${room}`);
  }

  // Emit message status update event to company room
  emitMessageStatusUpdate(companyId: string, statusUpdate: any) {
    const room = `company:${companyId}`;
    this.server.to(room).emit('message.status.updated', statusUpdate);
    this.logger.log(`Emitted message.status.updated to room: ${room} - ${statusUpdate.remoteId} -> ${statusUpdate.status}`);
  }

  // Emit task message status update event to task-specific room
  emitTaskMessageStatusUpdate(taskId: string, statusUpdate: any) {
    const room = `task:${taskId}`;
    this.server.to(room).emit('task.message.status.updated', statusUpdate);
    this.logger.log(`Emitted task.message.status.updated to room: ${room} - ${statusUpdate.remoteId} -> ${statusUpdate.status}`);
  }

  @SubscribeMessage('join-task')
  handleJoinTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `task:${data.taskId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined task room: ${room}`);
    client.emit('joined-task', { taskId: data.taskId });
  }

  @SubscribeMessage('leave-task')
  handleLeaveTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `task:${data.taskId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left task room: ${room}`);
  }
}
