import sys
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn
from dotenv import load_dotenv
from supabase import create_client, Client
from langfuse.langchain import CallbackHandler

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

# Inicializar Langfuse
langfuse_handler = CallbackHandler(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY")
)

# API Key Security
API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

async def get_api_key(api_key: str = Security(api_key_header)):
    expected_api_key = os.getenv("INTERNAL_API_KEY")
    if not expected_api_key:
        # If no key is set in production, we might want to warn but allow during setup
        # However, for security, it's better to require it if we are intentional about it.
        return api_key
    if api_key != expected_api_key:
        raise HTTPException(
            status_code=403, 
            detail="Could not validate credentials"
        )
    return api_key

@app.get("/")
async def root():
    return {
        "status": "ok", 
        "message": "Prompt Builder API is running",
        "env_check": {
            "SUPABASE_URL": "Set" if os.getenv("SUPABASE_URL") else "Missing",
            "SUPABASE_KEY": "Set" if os.getenv("SUPABASE_KEY") else "Missing",
            "OPENAI_API_KEY": "Set" if os.getenv("OPENAI_API_KEY") else "Missing",
            "INTERNAL_API_KEY": "Set" if os.getenv("INTERNAL_API_KEY") else "Missing"
        }
    }

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
        
        # Ejecutar el agente con Langfuse Tracing
        # Pasamos el handler a través de la configuración de LangGraph si es posible, 
        # o lo usamos directamente en el nodo (que ya está configurado para usar ChatOpenAI).
        # Para LangGraph, podemos pasar callbacks en la invocación.
        config = {"callbacks": [langfuse_handler], "run_name": f"Prompt Generation - {location_id}"}
        result = agent.invoke(initial_state, config=config)
        
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
