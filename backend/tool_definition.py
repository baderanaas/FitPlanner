import inspect
from typing import Dict, List, Optional

from tools import _get_meal_prep, _get_nutrition_info, _bmi_calculator, _get_bodyfat_percentage, _get_ideal_weight, _get_macro_calculator


def generate_tool_definition(func, state) -> Dict:
    """
    Generate a tool definition for OpenAI function calling with enhanced validation.

    Args:
        func (Callable): The function to convert into a tool
        state (Optional[Dict]): Agent state containing user_id and other metadata

    Returns:
        dict: OpenAI-compatible tool definition

    Raises:
        ValueError: If the function is missing required documentation
    """
    # Validate function documentation
    if not func.__doc__:
        raise ValueError(f"Tool function {func.__name__} is missing required docstring")

    try:
        signature = inspect.signature(func)
    except ValueError:
        raise ValueError(f"Could not inspect signature for {func.__name__}")

    parameters = {"type": "object", "properties": {}, "required": []}

    # Generate parameter descriptions
    for param_name, param in signature.parameters.items():
        param_desc = param.annotation.__name__ if param.annotation else "str"
        if param.default != inspect.Parameter.empty:
            param_desc += f" (default: {param.default})"

        parameters["properties"][param_name] = {
            "type": "string",
            "description": param_desc,
        }
        if param.default == inspect.Parameter.empty:
            parameters["required"].append(param_name)

    # Special handling for check_memory_systems
    if func.__name__ == "get_memories":
        # Inject user_id into the tool definition
        if state and "user_id" in state:
            parameters["properties"]["key"] = {
                "type": "string",
                "description": "The session ID used for memory retrieval (injected automatically).",
                "default": state["user_id"],
            }
        else:
            parameters["properties"]["key"] = {
                "type": "string",
                "description": "Specific key to retrieve a particular memory entry.",
            }

    return {
        "type": "function",
        "function": {
            "name": func.__name__,
            "description": func.__doc__.strip(),
            "parameters": parameters,
        },
    }


def get_tools(state) -> List[Dict]:
    """
    Get validated tool definitions for all available tools.

    Returns:
        list: OpenAI-compatible tool definitions

    Raises:
        RuntimeError: If any tool definition fails validation
    """
    tools = []
    for func in [
        _get_meal_prep, _get_nutrition_info, _bmi_calculator, _get_bodyfat_percentage, _get_ideal_weight, _get_macro_calculator

    ]:
        try:
            tools.append(generate_tool_definition(func, state))
        except Exception as e:
            raise RuntimeError(
                f"Invalid tool configuration for {func.__name__}: {str(e)}"
            )
    return tools


def get_tools_mapping() -> Dict[str, callable]:
    """
    Get a validated mapping of tool names to their implementations.

    Returns:
        dict: Tool name to function mapping

    Raises:
        RuntimeError: If any tool implementation is invalid
    """
    mapping = {}
    for name, func in [
        ("_get_meal_prep",_get_meal_prep), ("_get_nutrition_info",_get_nutrition_info), ("_bmi_calculator",_bmi_calculator), ("_get_bodyfat_percentage",_get_bodyfat_percentage), ("_get_ideal_weight",_get_ideal_weight), ("_get_macro_calculator",_get_macro_calculator)

    ]:
        if not callable(func):
            raise RuntimeError(f"Tool {name} is not a callable function")
        mapping[name] = func
    return mapping
