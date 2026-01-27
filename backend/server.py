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
from langfuse import Langfuse

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
    import traceback
    import httpx
    print("DEBUG: Starting test-trace diagnostic...")
    
    # 1. Verificar variables
    pk = os.getenv("LANGFUSE_PUBLIC_KEY")
    sk = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
    
    diag = {
        "env": {
            "host": host,
            "pk_len": len(pk) if pk else 0,
            "sk_len": len(sk) if sk else 0,
            "pk_prefix": pk[:10] if pk else None
        },
        "steps": []
    }

    if not pk or not sk:
        return {"status": "error", "message": "Missing keys", "diag": diag}

    # 2. Test de Red (Rechazabilidad)
    try:
        print(f"DEBUG: Pinging host {host}...")
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(host)
            diag["steps"].append({"step": "network_reachability", "status": "ok", "code": resp.status_code})
    except Exception as e:
        diag["steps"].append({"step": "network_reachability", "status": "failed", "error": str(e)})

    # 3. Inicializar Cliente
    try:
        print("DEBUG: Initializing Langfuse client...")
        # Limpiar cualquier espacio en blanco accidental en las llaves
        pk = pk.strip()
        sk = sk.strip()
        host = host.strip()
        
        lf = Langfuse(public_key=pk, secret_key=sk, host=host, timeout=10)
        diag["steps"].append({"step": "client_init", "status": "ok"})
        
        # 4. Auth Check
        print("DEBUG: Calling auth_check()...")
        auth_ok = lf.auth_check()
        diag["steps"].append({"step": "auth_check", "status": "ok", "result": auth_ok})
        
        if not auth_ok:
            return {"status": "error", "message": "Auth check failed - check your keys", "diag": diag}
            
        # 5. Send Event (Modern v3 style)
        print("DEBUG: Sending event...")
        # Intentamos los dos métodos conocidos por si acaso
        try:
            lf.event(name="test-v3-style", metadata={"source": "api"})
            diag["steps"].append({"step": "send_event_v3", "status": "ok"})
        except AttributeError:
            lf.create_event(name="test-v2-style", metadata={"source": "api"})
            diag["steps"].append({"step": "send_event_v2", "status": "ok"})
            
        # 6. Flush
        print("DEBUG: Flushing...")
        lf.flush()
        diag["steps"].append({"step": "flush", "status": "ok"})
        
        return {"status": "success", "message": "Langfuse connection verified!", "diag": diag}

    except Exception as e:
        print(f"DEBUG: Diagnostic failed: {e}")
        return {
            "status": "error", 
            "message": str(e), 
            "type": type(e).__name__,
            "diag": diag,
            "traceback": traceback.format_exc()
        }

@app.get("/api/debug-env")
async def debug_env():
    # Helper para que el usuario verifique sus llaves sin exponerlas todas
    pk = os.getenv("LANGFUSE_PUBLIC_KEY", "")
    sk = os.getenv("LANGFUSE_SECRET_KEY", "")
    return {
        "LANGFUSE_HOST": os.getenv("LANGFUSE_HOST"),
        "PK": f"{pk[:10]}... (len: {len(pk)})",
        "SK": f"{sk[:10]}... (len: {len(sk)})",
        "VITE_API_KEY": f"{os.getenv('VITE_API_KEY', '')[:5]}...",
        "SUPABASE_URL": os.getenv("SUPABASE_URL")
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
        
        # Metadata enriquecida para Langfuse
        langfuse_metadata = {
            "assistant_role": assistant_role,
            "agency_name": agency_name,
            "tasks": tasks,
            "process": "prompt_builder_v1"
        }
        
        # 1. Crear un handler específico para esta petición para poder setear userId y traceName
        # Esto asegura que la traza se llame como la agencia y el usuario sea la location_id
        local_handler = None
        pk = os.getenv("LANGFUSE_PUBLIC_KEY")
        sk = os.getenv("LANGFUSE_SECRET_KEY")
        host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
        
        if pk and sk:
            try:
                local_handler = CallbackHandler(
                    public_key=pk.strip(),
                    secret_key=sk.strip(),
                    host=host.strip(),
                    user_id=location_id,
                    trace_name=agency_name
                )
            except Exception as le:
                print(f"DEBUG: Could not init local langfuse handler: {le}")

        # 2. Configurar callbacks y metadata para Langchain
        callbacks = [local_handler] if local_handler else []
        config = {
            "callbacks": callbacks, 
            "metadata": langfuse_metadata,
            "tags": [location_id, agency_name],
            "run_name": f"Generation: {agency_name}"
        }
        
        print(f"DEBUG: Invoking agent for location {location_id} (Agency: {agency_name})")
        result = agent.invoke(initial_state, config=config)
        print("DEBUG: Agent invocation successful")
        
        # 3. Forzar el envío de la traza ANTES de responder
        if local_handler:
            try:
                print("DEBUG: Flushing Langfuse trace...")
                local_handler.flush()
            except Exception as fe:
                print(f"DEBUG: Langfuse flush failed: {fe}")
        
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
