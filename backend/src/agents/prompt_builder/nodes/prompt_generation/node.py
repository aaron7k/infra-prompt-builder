from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from agents.prompt_builder.state import State
from agents.prompt_builder.nodes.prompt_generation.prompt import (
    PROMPT_BUILDER_SYSTEM_PROMPT,
    PROMPT_BUILDER_USER_TEMPLATE
)

# Nota: El usuario especificó modelos como gpt-4o-mini o gpt-4.1-mini.
# Usaremos gpt-4o-mini por defecto.
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

def generate_prompt_node(state: State, config: RunnableConfig) -> dict:
    """
    Nodo que genera el prompt del asistente.
    """
    user_content = PROMPT_BUILDER_USER_TEMPLATE.format(
        assistant_role=state.get("assistant_role", "Asistente"),
        agency_name=state.get("agency_name", "N/A"),
        tasks=", ".join(state.get("tasks", [])),
        context=state.get("context", "Sin contexto adicional"),
        few_shot=", ".join(state.get("few_shot", [])),
        format_restrictions=state.get("format_restrictions", "Sin restricciones"),
        tool_logic=state.get("tool_logic", "Sin lógica de herramientas")
    )
    
    from utils.langfuse_client import get_langfuse_prompt
    
    # Intentar obtener el prompt de Langfuse, fallback al local
    system_prompt = get_langfuse_prompt("prompt-builder", PROMPT_BUILDER_SYSTEM_PROMPT)
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_content)
    ]
    
    # Pasamos el config para que se incluyan los callbacks (Langfuse)
    response = llm.invoke(messages, config=config)
    
    return {
        "generated_prompt": response.content,
        "messages": state.get("messages", []) + [response]
    }
