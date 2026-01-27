from langgraph.graph import StateGraph, END
from agents.prompt_builder.state import State
from agents.prompt_builder.nodes.prompt_generation.node import generate_prompt_node

def create_prompt_builder_agent():
    """
    Crea el grafo del agente Prompt Builder.
    """
    workflow = StateGraph(State)
    
    # Añadir nodos
    workflow.add_node("generate_prompt", generate_prompt_node)
    
    # Definir el punto de entrada
    workflow.set_entry_point("generate_prompt")
    
    # Añadir bordes
    workflow.add_edge("generate_prompt", END)
    
    return workflow.compile()

# Instancia global del agente
agent = create_prompt_builder_agent()
