import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import axios from 'axios';

export interface MediaFetchRequest {
  mediaId: string;
  mediaUrl?: string;
  mimeType?: string;
  sha256?: string;
  messageId: string;
  companyId: string;
}

export interface MediaFetchResponse {
  success: boolean;
  fileId?: string;
  downloadUrl?: string;
  error?: string;
  size?: number;
  mimeType?: string;
}

@Injectable()
export class MediaFetcherConsumer {
  private readonly logger = new Logger(MediaFetcherConsumer.name);

  @EventPattern('channel.media.fetch')
  async handleMediaFetch(
    @Payload() data: MediaFetchRequest,
    @Ctx() context: NatsContext,
  ): Promise<MediaFetchResponse> {
    this.logger.debug(`📥 Received media fetch request for mediaId: ${data.mediaId}`);

    try {
      // Si ya tenemos mediaUrl, no necesitamos procesar
      if (data.mediaUrl) {
        this.logger.debug(`✅ Media already available at: ${data.mediaUrl}`);
        return {
          success: true,
          downloadUrl: data.mediaUrl,
          mimeType: data.mimeType,
        };
      }

      // Aquí podríamos implementar lógica adicional para:
      // 1. Descargar desde WhatsApp API si es necesario
      // 2. Procesar el archivo (redimensionar imágenes, etc.)
      // 3. Subir a Knowledge Base o storage permanente
      // 4. Generar URL de descarga

      this.logger.warn(`⚠️ No mediaUrl provided for mediaId: ${data.mediaId}`);
      
      return {
        success: false,
        error: 'No media URL available for processing',
      };

    } catch (error) {
      this.logger.error(`❌ Error processing media ${data.mediaId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Método auxiliar para descargar media desde URL externa
   */
  private async downloadMedia(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Método auxiliar para subir a Knowledge Base
   */
  private async uploadToKnowledgeBase(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    companyId: string,
  ): Promise<{ fileId: string; downloadUrl: string }> {
    // Implementar upload a Knowledge Base
    // Por ahora retornamos mock data
    return {
      fileId: `kb_${Date.now()}`,
      downloadUrl: `http://knowledge-base/files/${filename}`,
    };
  }
}
