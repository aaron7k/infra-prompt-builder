# Prompt Builder AI Agent

Sistema de generación de prompts expertos para asistentes de LangChain, integrado con Go High Level (GHL), Supabase y Langfuse.

## 🚀 Características

- ✅ Generación de prompts con IA (GPT-4o-mini)
- ✅ Arquitectura de agente con LangGraph
- ✅ Persistencia en Supabase con soporte para múltiples ubicaciones (GHL)
- ✅ Trazabilidad y monitoreo con Langfuse
- ✅ Interfaz moderna con React y navegación entre páginas
- ✅ Formulario de dos columnas con todos los parámetros del prompt
- ✅ Historial de prompts guardados por ubicación

## 📋 Requisitos Previos

- Python 3.12+ (para compatibilidad con Langfuse)
- Node.js 18+
- Cuenta en Supabase
- API Key de OpenAI
- Cuenta en Langfuse (opcional, para trazabilidad)

## 🛠️ Instalación

### Backend

1. Navega a la carpeta del backend:
```bash
cd backend
```

2. Crea un entorno virtual:
```bash
python3.12 -m venv venv
source venv/bin/activate
```

3. Instala las dependencias:
```bash
pip install fastapi uvicorn langchain langchain-openai langgraph pydantic python-multipart supabase langfuse python-dotenv
```

4. Configura las variables de entorno:
```bash
cp .env.example .env
# Edita .env con tus credenciales reales
```

5. Ejecuta el servidor:
```bash
python3 main.py
```

El backend estará disponible en `http://localhost:8000`

### Frontend

1. Navega a la carpeta del frontend:
```bash
cd frontend
```

2. Instala las dependencias:
```bash
npm install
```

3. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

## 🗄️ Configuración de Supabase

Ejecuta la siguiente migración SQL en tu proyecto de Supabase:

```sql
-- Crear tabla de prompts
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    location_id TEXT NOT NULL,
    assistant_role TEXT NOT NULL,
    agency_name TEXT NOT NULL,
    parameters JSONB,
    generated_prompt TEXT NOT NULL
);

-- Crear índice para búsquedas por location_id
CREATE INDEX IF NOT EXISTS idx_prompts_location_id 
ON public.prompts(location_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública
CREATE POLICY "Enable read access for all users" 
ON public.prompts FOR SELECT 
USING (true);

-- Política para permitir inserción pública
CREATE POLICY "Enable insert access for all users" 
ON public.prompts FOR INSERT 
WITH CHECK (true);

-- Política para permitir eliminación pública
CREATE POLICY "Enable delete access for all users" 
ON public.prompts FOR DELETE 
USING (true);
```

## 🔑 Variables de Entorno

Crea un archivo `.env` en la carpeta `backend` basado en `.env.example`:

```bash
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_clave_anon_aqui

# OpenAI
OPENAI_API_KEY=sk-tu_api_key_aqui

# Langfuse (opcional)
LANGFUSE_PUBLIC_KEY=pk-lf-tu_public_key_aqui
LANGFUSE_SECRET_KEY=sk-lf-tu_secret_key_aqui
LANGFUSE_HOST=https://cloud.langfuse.com
```

## 📱 Integración con GHL

Para embedir la aplicación en Go High Level, usa la siguiente URL:

```
http://localhost:5173/?location_id=TU_LOCATION_ID
```

La aplicación automáticamente:
- Capturará el `location_id` de la URL
- Guardará los prompts asociados a esa ubicación
- Mostrará el historial filtrado por ubicación

## 🎨 Rutas Disponibles

- `/` - Formulario de generación de prompts
- `/history` - Historial de prompts guardados

Ambas rutas preservan el `location_id` en los query params.

## 📝 Estructura del Proyecto

```
prompt-builder/
├── backend/
│   ├── main.py                    # API FastAPI + endpoints CRUD
│   ├── .env.example               # Template de variables de entorno
│   └── src/agents/prompt_builder/
│       ├── agent.py               # Definición del grafo LangGraph
│       ├── state.py               # Estado del agente
│       └── nodes/
│           └── prompt_generation/
│               ├── node.py        # Lógica del nodo de generación
│               └── prompt.py      # Templates de prompts
└── frontend/
    ├── src/
    │   ├── App.jsx                # Router y navegación
    │   ├── components/
    │   │   └── PromptForm.jsx     # Formulario principal
    │   └── pages/
    │       └── HistoryPage.jsx    # Página de historial
    └── index.css                  # Estilos globales
```

## 🎯 Uso

1. **Generar un Prompt**:
   - Completa todos los campos del formulario
   - Selecciona si prefieres escribir el contexto o subir un archivo
   - Click en "Generar Prompt Maestro"
   - El prompt se generará y guardará automáticamente

2. **Ver Historial**:
   - Click en la pestaña "Historial"
   - Selecciona un prompt de la lista
   - Visualiza los detalles completos
   - Copia o elimina según necesites

## 🔧 API Endpoints

- `POST /generate-prompt` - Generar un nuevo prompt
- `GET /prompts/{location_id}` - Obtener prompts por ubicación
- `POST /prompts` - Guardar un prompt
- `DELETE /prompts/{id}` - Eliminar un prompt

## 📊 Monitoreo con Langfuse

Si configuras las credenciales de Langfuse, automáticamente obtendrás:
- Trazas de todas las llamadas al LLM
- Métricas de costos por generación
- Logs de latencia y performance

Visita tu dashboard de Langfuse para ver las estadísticas.

## 🛡️ Seguridad

- Las políticas RLS de Supabase están configuradas para pruebas
- En producción, configura políticas más restrictivas
- Considera agregar autenticación para endpoints sensibles

## 📄 Licencia

MIT
