import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly redis: Redis;
  private readonly logger = new Logger('CacheService');
  private readonly defaultTtl = 15 * 60; // 15 minutos en segundos

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const username = this.configService.get<string>('REDIS_USER');
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const enableTlsFlag = this.configService.get<string>('REDIS_TLS') === 'true';

    const retryStrategy = (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    };

    if (url) {
      // Prefer explicit REDIS_URL. If it is rediss://, enable TLS with SNI automatically
      try {
        const isSecure = url.startsWith('rediss://');
        const servername = isSecure ? new URL(url).hostname : undefined;
        this.logger.log(`Initializing Redis via URL (${isSecure ? 'TLS' : 'plain'}): ${servername || url}`);
        this.redis = new Redis(url, {
          retryStrategy,
          ...(isSecure ? { tls: { servername } } : {}),
          // BullMQ/ioredis best practice for cluster/proxy: avoid request timeouts
          maxRetriesPerRequest: null,
        } as any);
      } catch (e) {
        this.logger.warn(`Failed to parse REDIS_URL, falling back to host/port. Error: ${e}`);
        this.redis = new Redis({
          host,
          port,
          username,
          password,
          retryStrategy,
          ...(enableTlsFlag ? { tls: { servername: host } } : {}),
          maxRetriesPerRequest: null,
        } as any);
      }
    } else {
      // Host/port mode with optional credentials and TLS via REDIS_TLS=true
      this.logger.log(`Initializing Redis via host/port (${enableTlsFlag ? 'TLS' : 'plain'}): ${host}:${port}`);
      this.redis = new Redis({
        host,
        port,
        username,
        password,
        retryStrategy,
        ...(enableTlsFlag ? { tls: { servername: host } } : {}),
        maxRetriesPerRequest: null,
      } as any);
    }

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error);
    });
  }

  /**
   * Genera una clave para el contexto de usuario
   * @param userId ID del usuario
   * @param companyId ID de la compañía
   * @returns Clave para el contexto de usuario
   */
  getUserContextKey(userId: string, companyId: string): string {
    return `user:context:${userId}:${companyId}`;
  }

  /**
   * Genera una clave para la verificación de acceso
   * @param userId ID del usuario
   * @param companyId ID de la compañía
   * @param resource Recurso a verificar
   * @param action Acción a verificar
   * @returns Clave para la verificación de acceso
   */
  getAccessCheckKey(userId: string, companyId: string, resource: string, action: string): string {
    return `access:check:${userId}:${companyId}:${resource}:${action}`;
  }
  
  /**
   * Guarda un valor en caché
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param ttl Tiempo de vida en segundos (por defecto 15 minutos)
   */
  async set(key: string, value: any, ttl: number = this.defaultTtl): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.set(key, serializedValue, 'EX', ttl);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}`, error);
      // No lanzamos el error para que la aplicación siga funcionando sin caché
    }
  }

  /**
   * Obtiene un valor de la caché
   * @param key Clave del valor a obtener
   * @returns Valor almacenado o null si no existe
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}`, error);
      return null;
    }
  }

  /**
   * Elimina un valor de la caché
   * @param key Clave del valor a eliminar
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}`, error);
    }
  }

  /**
   * Elimina todos los valores que coincidan con un patrón
   * @param pattern Patrón de las claves a eliminar (ej: "user:*")
   */
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting cache by pattern ${pattern}`, error);
    }
  }

  // El método getUserContextKey ya está definido arriba
}
