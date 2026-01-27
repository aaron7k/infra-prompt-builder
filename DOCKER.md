# Prompt Builder AI Agent - Docker Deployment

## 🐳 Despliegue con Docker

Esta aplicación está completamente dockerizada para facilitar el despliegue en cualquier entorno.

### Prerequisitos

- Docker (v20.10+)
- Docker Compose (v2.0+)

### Estructura de Contenedores

- **Backend**: FastAPI + Python 3.12 (Puerto 8000)
- **Frontend**: React + Nginx (Puerto 80)

### Variables de Entorno

Crea un archivo `.env` en la carpeta `backend` con:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_clave_anon_aqui
OPENAI_API_KEY=sk-tu_api_key_aqui
LANGFUSE_PUBLIC_KEY=pk-lf-tu_public_key_aqui
LANGFUSE_SECRET_KEY=sk-lf-tu_secret_key_aqui
LANGFUSE_HOST=https://cloud.langfuse.com
```

### Comandos Docker

#### 1. Construir e Iniciar los Servicios

```bash
docker-compose up -d --build
```

#### 2. Ver Logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

#### 3. Verificar Estado

```bash
docker-compose ps
```

#### 4. Detener los Servicios

```bash
docker-compose down
```

#### 5. Reconstruir después de cambios

```bash
docker-compose up -d --build --force-recreate
```

### Acceso a la Aplicación

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Configuración de Producción

Para producción, modifica `docker-compose.yml`:

1. **Cambiar puertos** si es necesario
2. **Configurar dominio** en nginx
3. **Agregar HTTPS** con certificados SSL (Let's Encrypt)
4. **Configurar CORS** para tu dominio

#### Ejemplo con HTTPS (usando nginx-proxy)

```yaml
services:
  frontend:
    environment:
      - VIRTUAL_HOST=tudominio.com
      - LETSENCRYPT_HOST=tudominio.com
      - LETSENCRYPT_EMAIL=tu@email.com
```

### Debugging

#### Entrar al contenedor backend

```bash
docker exec -it prompt-builder-backend /bin/bash
```

#### Entrar al contenedor frontend

```bash
docker exec -it prompt-builder-frontend sh
```

#### Ver variables de entorno

```bash
docker exec prompt-builder-backend env
```

### Desarrollo Local vs Docker

**Desarrollo Local** (recomendado para desarrollo):
- Backend: `cd backend && python main.py`
- Frontend: `cd frontend && npm run dev`

**Docker** (recomendado para staging/producción):
- `docker-compose up -d`

### Troubleshooting

#### El backend no conecta a Supabase

Verifica que el `.env` esté en `backend/.env` y tenga las credenciales correctas.

#### El frontend no ve el backend

Asegúrate de que ambos servicios estén en la misma red de Docker y que el backend esté corriendo en el puerto 8000.

#### Permisos de archivos

Si tienes problemas de permisos al construir:
```bash
sudo chown -R $USER:$USER .
```

### Actualizar Dependencias

#### Backend

Edita `backend/requirements.txt` y reconstruye:
```bash
docker-compose up -d --build backend
```

#### Frontend

Edita `frontend/package.json` y reconstruye:
```bash
docker-compose up -d --build frontend
```

---

## 📊 Monitoreo

### Health Checks

El backend tiene un health check configurado que verifica cada 30s que el servicio esté respondiendo.

### Logs de Producción

Para producción, considera usar:
- **Sentry** para error tracking
- **Datadog** o **New Relic** para APM
- **ELK Stack** para centralizar logs

---

## 🔒 Seguridad

1. **Nunca commitees** el archivo `.env` con credenciales reales
2. **Usa secretos** de Docker Swarm o Kubernetes en producción
3. **Limita acceso** al puerto 8000 solo desde el frontend
4. **Implementa rate limiting** en nginx
5. **Configura CORS** correctamente para tu dominio

---

## 🚀 Deploy en Cloud

### Railway

```bash
railway login
railway init
railway up
```

### Render

1. Conecta tu repositorio GitHub
2. Crea un nuevo Web Service
3. Configura las variables de entorno
4. Deploy automático

### DigitalOcean App Platform

1. Conecta tu repositorio
2. Detecta automáticamente Docker Compose
3. Configura variables de entorno
4. Deploy

### AWS ECS / GCP Cloud Run / Azure Container Instances

Todos soportan Docker Compose o Dockerfiles directamente.

---

## 📝 Mantenimiento

### Actualizar Imágenes Base

```bash
docker-compose pull
docker-compose up -d --build
```

### Limpiar Recursos No Usados

```bash
docker system prune -a
```

### Backup de Datos

Si usas volumes persistentes:
```bash
docker run --rm -v prompt-builder_backend-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data
```
