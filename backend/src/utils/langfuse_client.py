import os
from langfuse import Langfuse

def get_langfuse_prompt(prompt_name: str, fallback_content: str = None) -> str:
    """
    Obtiene un prompt de Langfuse por su nombre.
    Busca la versión marcada como 'production'.
    Si falla, devuelve el fallback_content.
    """
    try:
        langfuse = Langfuse(
            public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
            secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
            host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
        )
        
        # Obtener el prompt de producción
        prompt = langfuse.get_prompt(prompt_name, type="chat")
        
        # Para prompts de tipo chat, el contenido suele estar en el primer mensaje de sistema
        # o directamente en el objeto si es string. Langfuse >= 2.0 devuelve un objeto Prompt.
        # Aquí asumimos que queremos el contenido compilado.
        return prompt.compile()
        
    except Exception as e:
        print(f"Error fetching prompt '{prompt_name}' from Langfuse: {e}")
        return fallback_content
