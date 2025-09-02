import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from '../schemas/task.schema';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  async findAll(companyId: string, limit = 50, offset = 0) {
    this.logger.debug(`Finding tasks for company: ${companyId}, limit: ${limit}, offset: ${offset}`);
    
    return this.taskModel
      .find({ companyId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  async findById(taskId: string, companyId: string) {
    return this.taskModel.findOne({ _id: taskId, companyId }).exec();
  }

  async findOrCreateForConversation(params: {
    companyId: string;
    channelType: string;
    connectionId: string;
    customerId: string;
  }): Promise<TaskDocument> {
    const { companyId, channelType, connectionId, customerId } = params;
    
    this.logger.debug(`Finding/creating task for conversation: ${customerId} in company: ${companyId}`);
    
    // Buscar tarea ABIERTA para este número de teléfono
    let task = await this.taskModel.findOne({
      companyId,
      channelType,
      connectionId,
      customerId,
      status: 'open' // Solo buscar tareas abiertas
    }).exec();

    if (task) {
      this.logger.debug(`✅ Found existing OPEN task: ${task._id} for customer: ${customerId}`);
      return task;
    }

    // Si no hay tarea abierta, crear una nueva
    task = await this.taskModel.create({
      companyId,
      channelType,
      connectionId,
      customerId,
      subject: `Conversation with ${customerId}`,
      status: 'open',
      participants: [customerId],
    });

    this.logger.log(`🆕 Created NEW task: ${task._id} for customer: ${customerId}`);
    return task;
  }

  async updateStatus(taskId: string, companyId: string, status: 'open' | 'closed' | 'archived') {
    this.logger.debug(`Updating task ${taskId} status to: ${status}`);
    
    return this.taskModel.findOneAndUpdate(
      { _id: taskId, companyId },
      { status, updatedAt: new Date() },
      { new: true }
    ).exec();
  }

  async getStats(companyId: string) {
    const stats = await this.taskModel.aggregate([
      { $match: { companyId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return {
      open: stats.find(s => s._id === 'open')?.count || 0,
      closed: stats.find(s => s._id === 'closed')?.count || 0,
      archived: stats.find(s => s._id === 'archived')?.count || 0,
    };
  }
}
