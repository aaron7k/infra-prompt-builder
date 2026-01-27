# Guía Técnica: Integración de Langfuse con LangChain/LangGraph

Este documento resume las lecciones aprendidas durante la depuración de la integración de Langfuse en este proyecto y establece las bases para futuras implementaciones.

## 1. Versión y Compatibilidad
En este proyecto utilizamos `langfuse==3.11.2`. 

> [!IMPORTANT]
> A diferencia de versiones más recientes, el `CallbackHandler` de esta versión tiene una firma muy restringida en su constructor.

### Firma del Constructor (v3.11.2)
```python
def __init__(self, *, public_key=None, update_trace=False, trace_context=None)
```
**NUNCA** pases `secret_key`, `host`, `user_id` o `trace_name` directamente al constructor de `CallbackHandler` en esta versión, ya que causará un `TypeError`.

---

## 2. Configuración de Credenciales
La forma más robusta de configurar Langfuse (especialmente en entornos Docker/Dokploy) es mediante variables de entorno. El SDK las detecta automáticamente:

*   `LANGFUSE_PUBLIC_KEY`
*   `LANGFUSE_SECRET_KEY`
*   `LANGFUSE_HOST` (e.g., `https://fuse.holocron-ia.com`)

En el código, simplemente inicializa el handler sin argumentos:
```python
from langfuse.langchain import CallbackHandler
handler = CallbackHandler() # Las llaves se toman del entorno
```

---

## 3. Atribución de Usuario y Nombre de Traza
Para que las trazas sean útiles, necesitamos identificar quién las ejecuta y qué representan. En LangChain/LangGraph, esto se hace a través del objeto `config`.

### El patrón correcto:
```python
config = {
    "callbacks": [handler],
    "metadata": {
        "langfuse_user_id": location_id,   # ID del usuario/cliente
        "langfuse_trace_name": agency_name # Nombre descriptivo de la traza
    },
    "run_name": agency_name, # Nombre que aparecerá en el dashboard principal
    "tags": ["prod", location_id]
}

agent.invoke(state, config=config)
```

---

## 4. El Mecanismo de Flush
En aplicaciones web (FastAPI/Flask), el servidor suele responder tan rápido que el SDK de Langfuse no tiene tiempo de enviar los datos antes de que el proceso termine o se libere.

> [!WARNING]
> El `CallbackHandler` **no** tiene un método `.flush()` directo. Debes acceder al cliente interno.

```python
if handler and hasattr(handler, 'client'):
    handler.client.flush()
```
Esto garantiza que la traza se envíe de forma síncrona antes de devolver la respuesta al cliente.

---

## 5. Diagnóstico de Conexión
Si las trazas no llegan, sigue este orden de verificación:

1.  **Red**: ¿Es el host resoluble desde el contenedor? Use `httpx` o `curl` para un simple GET al host.
2.  **Auth**: Use el cliente base de Langfuse para un `auth_check()`:
    ```python
    from langfuse import Langfuse
    lf = Langfuse(pk, sk, host)
    print(lf.auth_check()) # Debe devolver True
    ```
3.  **Logs**: Siempre envuelve el `flush()` en un try/except para capturar errores de red sin romper la API principal.

## 6. Integración con LangGraph
Al usar LangGraph, asegúrate de pasar el `config` en cada paso de `invoke` o `stream`. LangGraph propagará automáticamente el `CallbackHandler` a todos los nodos (generaciones, herramientas, etc.), permitiendo ver el grafo completo en Langfuse.

---
*Documento generado tras la resolución exitosa de la integración en Enero 2026.*
