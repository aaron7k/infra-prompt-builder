# Dokploy Deployment Guide

## Configuración en Dokploy

### 1. Variables de Entorno

En Dokploy, configura estas variables de entorno:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_clave_anon
OPENAI_API_KEY=sk-tu_key
LANGFUSE_PUBLIC_KEY=pk-lf-tu_key
LANGFUSE_SECRET_KEY=sk-lf-tu_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 2. Configuración del Proyecto

- **Repository**: `https://github.com/aaron7k/infra-prompt-builder.git`
- **Branch**: `main`
- **Build Type**: Docker Compose
- **Compose File Path**: `docker-compose.yml` (por defecto)

### 3. Puertos

Dokploy detectará automáticamente:
- Backend: Puerto 8000
- Frontend: Puerto 80

### 4. Build Context

Asegúrate de que Dokploy tenga acceso a:
- `./backend/Dockerfile`
- `./frontend/Dockerfile`

### 5. Health Checks

El backend tiene un health check configurado. El frontend esperará a que el backend esté healthy antes de iniciar.

### 6. Dominios

En Dokploy:
1. Ve a tu proyecto
2. Configura dominios personalizados si lo necesitas
3. El frontend estará disponible en el dominio principal
4. El backend en `/api` o en un subdominio

### 7. Troubleshooting

Si recibes errores de contenedor:
1. Verifica que las variables de entorno estén configuradas
2. Revisa los logs en Dokploy
3. Asegúrate de que el build context es correcto
4. Verifica que los Dockerfiles estén en las rutas correctas

### 8. Logs

Para ver logs en Dokploy:
- Click en tu proyecto
- Ve a "Logs"
- Selecciona el servicio (backend o frontend)

### 9. Rebuild

Si necesitas reconstruir:
1. Ve a tu proyecto en Dokploy
2. Click en "Rebuild"
3. Espera a que complete el build

## Diferencias con Docker Compose Local

Dokploy maneja automáticamente:
- Nombres de contenedores
- Networking
- Volume management
- SSL/TLS (si configuras dominios)

No necesitas especificar `container_name` en docker-compose.yml cuando usas Dokploy.
