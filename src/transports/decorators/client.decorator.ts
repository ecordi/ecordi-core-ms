import { Inject } from '@nestjs/common';

/**
 * Decorator para inyectar un cliente NATS
 * @param clientName Nombre del cliente a inyectar
 * @returns Decorator de inyección
 */
export const InjectClient = (clientName: string) => Inject(clientName);
