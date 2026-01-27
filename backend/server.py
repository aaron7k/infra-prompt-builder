import sys
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn
from dotenv import load_dotenv
from supabase import create_client, Client
from langfuse.callback import CallbackHandler

# Cargar variables de entorno
load_dotenv()

# Añadir src al path para imports relativos
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

print("--- SERVER STARTING VERSION 3.0-REFRESH (CACHE BREAKER) ---")
print(f"DEBUG: SUPABASE_URL is {'SET' if os.getenv('SUPABASE_URL') else 'MISSING'}")
print(f"DEBUG: SUPABASE_KEY is {'SET' if os.getenv('SUPABASE_KEY') else 'MISSING'}")

from agents.prompt_builder.agent import agent
from agents.prompt_builder.state import State

app = FastAPI(title="Prompt Builder API")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar Supabase
# Inicializar Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url:
    print("CRITICAL ERROR: SUPABASE_URL is missing from environment variables")
if not supabase_key:
    print("CRITICAL ERROR: SUPABASE_KEY is missing from environment variables")
    
if not supabase_url or not supabase_key:
    # Fallback dummy client to prevent crash during healthcheck if envs are missing
    # This allows us to see the logs instead of a crash loop
    print("WARNING: Initializing with dummy values to keep container alive for debugging")
    supabase_url = "https://example.supabase.co" 
    supabase_key = "dummy_key"

try:
    supabase: Client = create_client(supabase_url, supabase_key)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    supabase = None

# Inicializar Langfuse (Opcional, no debe romper el servidor si faltan llaves)
try:
    pk = os.getenv("LANGFUSE_PUBLIC_KEY")
    sk = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
    
    if pk and sk:
        langfuse_handler = CallbackHandler(
            public_key=pk,
            secret_key=sk,
            host=host
        )
        print("Langfuse handler initialized successfully")
    else:
        print("WARNING: Langfuse keys missing, tracing disabled")
        langfuse_handler = None
except Exception as e:
    print(f"Error initializing Langfuse: {e}")
    langfuse_handler = None

# API Key Security
API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

async def get_api_key(api_key: str = Security(api_key_header)):
    expected_api_key = os.getenv("VITE_API_KEY")
    if not expected_api_key:
        return api_key
    if api_key != expected_api_key:
        raise HTTPException(
            status_code=403, 
            detail="Could not validate credentials"
        )
    return api_key

@app.get("/")
@app.get("/api")
@app.get("/api/")
@app.get("/api/health")
async def root():
    return {
        "status": "ok", 
        "message": "Prompt Builder API is running - Version 4.0",
        "env_check": {
            "SUPABASE_URL": "Set" if os.getenv("SUPABASE_URL") else "Missing",
            "SUPABASE_KEY": "Set" if os.getenv("SUPABASE_KEY") else "Missing",
            "OPENAI_API_KEY": "Set" if os.getenv("OPENAI_API_KEY") else "Missing",
            "VITE_API_KEY": "Set" if os.getenv("VITE_API_KEY") else "Missing",
            "LANGFUSE_PUBLIC_KEY": "Set" if os.getenv("LANGFUSE_PUBLIC_KEY") else "Missing",
            "LANGFUSE_SECRET_KEY": "Set" if os.getenv("LANGFUSE_SECRET_KEY") else "Missing",
            "LANGFUSE_HOST": os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
        }
    }

@app.get("/api/test-trace")
async def test_trace():
    if not langfuse_handler:
        return {"status": "error", "message": "Langfuse handler not initialized"}
    
    try:
        # Intentar una traza manual simple
        print("DEBUG: Sending test trace to Langfuse...")
        # Note: CallbackHandler might not have a direct 'trace' method like the core SDK, 
        # but we can check connectivity via the underlying client if needed.
        # However, just checking if flush doesn't crash is a start.
        langfuse_handler.flush()
        return {
            "status": "success", 
            "message": "Manual flush triggered. Check Langfuse dashboard.",
            "host": os.getenv("LANGFUSE_HOST")
        }
    except Exception as e:
        print(f"DEBUG: Trace test failed: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/generate-prompt")
async def generate_prompt(
    assistant_role: str = Form(...),
    agency_name: str = Form(...),
    tasks: str = Form(...),
    context: str = Form(...),
    few_shot: str = Form(...),
    format_restrictions: str = Form(...),
    location_id: str = Form(...),
    tool_logic: Optional[str] = Form(None),
    api_key: str = Depends(get_api_key)
):
    try:
        # Preparar el estado inicial
        initial_state: State = {
            "assistant_role": assistant_role,
            "agency_name": agency_name,
            "tasks": [t.strip() for t in tasks.split(",") if t.strip()],
            "context": context,
            "few_shot": [f.strip() for f in few_shot.split(",") if f.strip()],
            "format_restrictions": format_restrictions,
            "tool_logic": tool_logic,
            "generated_prompt": "",
            "messages": []
        }
        
        # Ejecutar el agente con Langfuse Tracing (si está disponible)
        callbacks = [langfuse_handler] if langfuse_handler else []
        config = {"callbacks": callbacks, "run_name": f"Prompt Generation - {location_id}"}
        
        print(f"DEBUG: Invoking agent for location {location_id}...")
        result = agent.invoke(initial_state, config=config)
        print("DEBUG: Agent invocation successful")
        
        generated_prompt = result.get("generated_prompt", "")
        
        # Guardar en Supabase
        db_data = {
            "location_id": location_id,
            "assistant_role": assistant_role,
            "agency_name": agency_name,
            "parameters": {
                "tasks": initial_state["tasks"],
                "context": context,
                "few_shot": initial_state["few_shot"],
                "format_restrictions": format_restrictions,
                "tool_logic": tool_logic
            },
            "generated_prompt": generated_prompt
        }
        
        supabase.table("prompts").insert(db_data).execute()
        
        # Asegurar que las trazas se envíen
        if langfuse_handler:
            try:
                langfuse_handler.flush()
            except:
                pass
                
        return {
            "status": "success",
            "generated_prompt": generated_prompt,
            "messages": [m.content for m in result.get("messages", [])]
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/prompts/{location_id}")
async def get_prompts(location_id: str, api_key: str = Depends(get_api_key)):
    try:
        response = supabase.table("prompts").select("*").eq("location_id", location_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, api_key: str = Depends(get_api_key)):
    try:
        supabase.table("prompts").delete().eq("id", prompt_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-context")
async def upload_context(file: UploadFile = File(...), api_key: str = Depends(get_api_key)):
    try:
        content = await file.read()
        return {"content": content.decode("utf-8")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8888)
