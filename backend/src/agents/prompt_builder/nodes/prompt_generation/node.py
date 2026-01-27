from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from agents.prompt_builder.state import State
from agents.prompt_builder.nodes.prompt_generation.prompt import (
    PROMPT_BUILDER_SYSTEM_PROMPT,
    PROMPT_BUILDER_USER_TEMPLATE
)

# Nota: El usuario especificó modelos como gpt-4o-mini o gpt-4.1-mini.
# Usaremos gpt-4o-mini por defecto.
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

def generate_prompt_node(state: State) -> dict:
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
    
    messages = [
        SystemMessage(content=PROMPT_BUILDER_SYSTEM_PROMPT),
        HumanMessage(content=user_content)
    ]
    
    response = llm.invoke(messages)
    
    return {
        "generated_prompt": response.content,
        "messages": state.get("messages", []) + [response]
    }
