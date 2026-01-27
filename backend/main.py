import sys
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
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

@app.get("/")
    return {
        "status": "ok", 
        "message": "Prompt Builder API is running",
        "env_check": {
            "SUPABASE_URL": "Set" if os.getenv("SUPABASE_URL") else "Missing",
            "SUPABASE_KEY": "Set" if os.getenv("SUPABASE_KEY") else "Missing",
             "OPENAI_API_KEY": "Set" if os.getenv("OPENAI_API_KEY") else "Missing"
        }
    }

@app.post("/generate-prompt")
async def generate_prompt(
    assistant_role: str = Form(...),
    agency_name: str = Form(...),
    tasks: str = Form(...),
    context: str = Form(...),
    few_shot: str = Form(...),
    format_restrictions: str = Form(...),
    location_id: str = Form(...),
    tool_logic: Optional[str] = Form(None)
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

@app.get("/prompts/{location_id}")
async def get_prompts(location_id: str):
    try:
        response = supabase.table("prompts").select("*").eq("location_id", location_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str):
    try:
        supabase.table("prompts").delete().eq("id", prompt_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-context")
async def upload_context(file: UploadFile = File(...)):
    try:
        content = await file.read()
        return {"content": content.decode("utf-8")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
