# LinkedIn Module for Core MS

Este módulo integra todas las funcionalidades del LinkedIn Channel MS directamente en el Core MS, proporcionando una solución completa para la gestión de LinkedIn dentro de la arquitectura de microservicios.

## Funcionalidades Implementadas

### 1. Gestión de Conexiones LinkedIn
- **OAuth Flow**: Intercambio de códigos de autorización por tokens de acceso
- **Gestión de Tokens**: Renovación automática de tokens usando refresh tokens
- **Configuración de Webhooks**: Configuración de endpoints para recibir notificaciones
- **Suscripción a Eventos**: Registro automático para notificaciones de LinkedIn

### 2. Publicación de Contenido
- **Posts de Feed**: Creación y publicación de posts en el feed de LinkedIn
- **Comentarios**: Respuesta a posts existentes con comentarios
- **Contenido Multimedia**: Soporte para imágenes y videos en publicaciones
- **Programación**: Capacidad de programar publicaciones para fechas futuras

### 3. Procesamiento de Eventos
- **Webhooks de LinkedIn**: Recepción y procesamiento de notificaciones de LinkedIn
- **Eventos Sociales**: Manejo de interacciones sociales (likes, comentarios, shares)
- **Transformación de Datos**: Conversión de eventos de LinkedIn a formato interno
- **Distribución de Webhooks**: Reenvío de eventos a sistemas externos configurados

### 4. Comunicación NATS
- **Patrones de Mensajería**: Implementación de patrones NATS para comunicación asíncrona
- **Eventos Entrantes**: `linkedin.webhook.inbound` para eventos de LinkedIn
- **Posts Salientes**: `linkedin.post.outbound` para publicaciones
- **Estados de Conexión**: `linkedin.connection.status` para actualizaciones de estado
- **Renovación de Tokens**: `linkedin.token.refresh` para renovación automática

## Endpoints REST Disponibles

### Conexiones LinkedIn
```
POST   /api/v1/core/linkedin/connections          # Crear conexión
GET    /api/v1/core/linkedin/connections          # Listar conexiones
GET    /api/v1/core/linkedin/connections/:id      # Obtener conexión
PUT    /api/v1/core/linkedin/connections/:id      # Actualizar conexión
DELETE /api/v1/core/linkedin/connections/:id      # Eliminar conexión
POST   /api/v1/core/linkedin/connections/:id/refresh-token  # Renovar token
```

### Posts LinkedIn
```
POST   /api/v1/core/linkedin/posts                # Crear post
GET    /api/v1/core/linkedin/posts/connection/:id # Posts por conexión
GET    /api/v1/core/linkedin/posts/company/:id    # Posts por empresa
```

### Eventos LinkedIn
```
POST   /api/v1/core/linkedin/events/webhook       # Procesar webhook
GET    /api/v1/core/linkedin/events/connection/:id # Eventos por conexión
GET    /api/v1/core/linkedin/events/company/:id   # Eventos por empresa
```

## Esquemas de Base de Datos

### LinkedInConnection
- `connectionId`: ID único de la organización LinkedIn
- `companyId`: ID de la empresa en el sistema
- `displayName`: Nombre de la organización
- `memberId`: ID del miembro administrador
- `token`: Token de acceso actual
- `refreshToken`: Token para renovación
- `webhooks`: Configuración de webhooks
- `status`: Estado de la conexión (active, inactive)

### LinkedInPost
- `postId`: ID único del post
- `connectionId`: Referencia a la conexión
- `type`: Tipo de post (FEED, COMMENT)
- `content`: Contenido del post
- `mediaUrl`: URL de media adjunta
- `status`: Estado del post (pending, sent, failed)
- `linkedInResponse`: Respuesta de la API de LinkedIn

### LinkedInEvent
- `eventId`: ID único del evento
- `type`: Tipo de evento de LinkedIn
- `event`: Datos completos del evento
- `processed`: Estado de procesamiento
- `webhookResponses`: Respuestas de webhooks enviados

## Variables de Entorno Requeridas

```env
# LinkedIn API Configuration
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/v1/core/linkedin/oauth/callback
LINKEDIN_API_VERSION=v2
```

## Flujo de Integración

1. **Configuración OAuth**: Configurar credenciales de LinkedIn en variables de entorno
2. **Crear Conexión**: Usar endpoint POST /connections con código de autorización
3. **Publicar Contenido**: Usar endpoint POST /posts para crear publicaciones
4. **Recibir Eventos**: Configurar webhooks para recibir notificaciones de LinkedIn
5. **Procesar Eventos**: Los eventos se procesan automáticamente y se distribuyen según configuración

## Patrones NATS Implementados

### Listeners (Recibe mensajes)
- `linkedin.post.outbound`: Crear posts desde otros servicios
- `linkedin.webhook.inbound`: Procesar webhooks de LinkedIn
- `linkedin.connection.status`: Actualizar estado de conexiones
- `linkedin.connection.create`: Crear nuevas conexiones
- `linkedin.token.refresh`: Renovar tokens de acceso

### Publishers (Envía mensajes)
- Eventos procesados se pueden reenviar a otros servicios según configuración de webhooks

## Compatibilidad con LinkedIn Channel MS

Este módulo reemplaza completamente la funcionalidad del LinkedIn Channel MS independiente, proporcionando:
- Misma API de LinkedIn utilizada
- Mismo flujo OAuth implementado
- Mismos tipos de eventos soportados
- Misma estructura de datos mantenida
- Integración nativa con Core MS sin necesidad de HTTP entre servicios

## Beneficios de la Integración

1. **Menor Latencia**: Eliminación de llamadas HTTP entre servicios
2. **Mejor Consistencia**: Transacciones de base de datos unificadas
3. **Simplificación**: Menos servicios que mantener y desplegar
4. **Mejor Observabilidad**: Logs y métricas centralizados
5. **Desarrollo Más Rápido**: Menos complejidad de comunicación entre servicios
