from typing import List, Optional, TypedDict
from langchain_core.messages import BaseMessage

class State(TypedDict):
    """
    Estado del agente Prompt Builder.
    """
    assistant_role: str
    agency_name: str
    tasks: List[str]
    context: str
    few_shot: List[str]
    format_restrictions: str
    tool_logic: Optional[str]
    additional_instructions: Optional[str]
    generated_prompt: str
    messages: List[BaseMessage]
