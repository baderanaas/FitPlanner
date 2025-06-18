import os
import logging
from typing import Dict, List, Any
from agentState import AgentState
from tool_definition import get_tools
from openai import Client
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
client = Client(api_key=openai_api_key)


def convert_message_to_dict(message: Any) -> Dict:
    """Convert LangChain message objects to dictionary format for OpenAI API."""
    
    # Mapping from LangChain message types to OpenAI roles
    LANGCHAIN_TO_OPENAI_ROLE = {
        "system": "system",
        "human": "user",
        "ai": "assistant",
        "assistant": "assistant",
        "user": "user",
        "function": "function",
        "tool": "tool"
    }
    
    try:
        if isinstance(message, dict):
            logger.debug(f"Message is already dict: {type(message)}")
            # If it's already a dict, ensure the role is properly mapped
            if "role" in message:
                message["role"] = LANGCHAIN_TO_OPENAI_ROLE.get(message["role"], message["role"])
            return message
        
        # Handle string messages (fallback)
        if isinstance(message, str):
            logger.debug(f"Converting string message to user role")
            return {
                "role": "user",
                "content": message
            }
        
        # Handle LangChain message objects
        if hasattr(message, 'type') and hasattr(message, 'content'):
            langchain_type = message.type
            openai_role = LANGCHAIN_TO_OPENAI_ROLE.get(langchain_type, "user")
            
            logger.debug(f"Converting LangChain message: {type(message)}, type='{langchain_type}' -> role='{openai_role}'")
            
            return {
                "role": openai_role,
                "content": str(message.content) if message.content is not None else ""
            }
        
        # Handle other message objects with role and content attributes
        if hasattr(message, 'role') and hasattr(message, 'content'):
            original_role = message.role
            mapped_role = LANGCHAIN_TO_OPENAI_ROLE.get(original_role, original_role)
            
            logger.debug(f"Converting message with role/content: {type(message)}, role='{original_role}' -> '{mapped_role}'")
            
            return {
                "role": mapped_role,
                "content": str(message.content) if message.content is not None else ""
            }
        
        # Fallback: try to convert to string
        logger.warning(f"Unknown message type {type(message)}, converting to user message")
        return {
            "role": "user",  # Default role
            "content": str(message)
        }
        
    except Exception as e:
        logger.error(f"Error converting message {type(message)}: {e}")
        return {
            "role": "user",
            "content": str(message)
        }


def call_openai(state: AgentState, tools: List[Dict]) -> Dict:
    """Call OpenAI API with proper error handling and logging."""
    model = "gpt-4o-mini"
    temperature = 0.1  # Should be float, not string
    
    logger.info(f"Calling OpenAI with model: {model}, temperature: {temperature}")
    logger.info(f"Number of tools available: {len(tools)}")
    logger.info(f"Number of messages in state: {len(state.get('messages', []))}")
    
    # Convert and validate messages
    converted_messages = []
    for i, message in enumerate(state["messages"]):
        logger.debug(f"Processing message {i}: type={type(message)}")
        
        try:
            converted_msg = convert_message_to_dict(message)
            
            # Ensure content is string or list
            if not isinstance(converted_msg["content"], (str, list)):
                logger.warning(f"Converting message content from {type(converted_msg['content'])} to string")
                converted_msg["content"] = str(converted_msg["content"])
            
            converted_messages.append(converted_msg)
            logger.debug(f"Converted message {i}: role={converted_msg['role']}, content_type={type(converted_msg['content'])}")
            
        except Exception as e:
            logger.error(f"Error processing message {i}: {e}")
            # Skip problematic messages or provide default
            converted_messages.append({
                "role": "user",
                "content": f"Error processing message: {str(e)}"
            })

    logger.info(f"Successfully converted {len(converted_messages)} messages")

    try:
        logger.debug("Making OpenAI API call...")
        response = client.chat.completions.create(
            model=model,
            messages=converted_messages,
            tools=tools if tools else None,
            tool_choice="auto" if tools else None,
            temperature=temperature,
        )
        
        logger.info("OpenAI API call successful")
        logger.debug(f"Response choice count: {len(response.choices)}")
        
        msg = response.choices[0].message
        logger.debug(f"Response message content length: {len(msg.content) if msg.content else 0}")
        logger.debug(f"Response has tool calls: {bool(msg.tool_calls)}")
        
        result = {
            "role": "assistant",
            "content": msg.content,
        }
        
        # Add tool calls if present
        if msg.tool_calls:
            logger.info(f"Response includes {len(msg.tool_calls)} tool calls")
            result["tool_calls"] = [
                {
                    "id": call.id,
                    "type": "function",
                    "function": {
                        "name": call.function.name,
                        "arguments": call.function.arguments,
                    },
                }
                for call in msg.tool_calls
            ]
            
        logger.info("Successfully created response dictionary")
        return result
        
    except Exception as e:
        logger.error(f"OpenAI API call failed: {e}")
        logger.error(f"Error type: {type(e)}")
        raise


def call_model(state: AgentState) -> AgentState:
    """Main function to call the model with comprehensive error handling."""
    logger.info("=== Starting call_model ===")
    logger.info(f"Input state type: {type(state)}")
    logger.info(f"Input state keys: {list(state.keys()) if isinstance(state, dict) else 'Not a dict'}")
    
    try:
        # Get tools
        logger.debug("Getting tools...")
        tools = get_tools(state)
        logger.info(f"Retrieved {len(tools) if tools else 0} tools")
        
        if not tools:
            logger.warning("No tools available for this question")
            return {
                "messages": [
                    {
                        "role": "assistant",
                        "content": "No tools available for this question.",
                    }
                ],
                "tool_call_history": state.get("tool_call_history", {}),
            }

        # Call OpenAI
        logger.debug("Calling OpenAI...")
        response = call_openai(state, tools)
        logger.info("OpenAI call completed successfully")
        
        # Prepare result state
        result_state = {
            "messages": [response],
            "tool_call_history": state.get("tool_call_history", {}),
        }
        
        logger.info("=== call_model completed successfully ===")
        return result_state
        
    except Exception as e:
        logger.error(f"=== call_model failed ===")
        logger.error(f"Error: {e}")
        logger.error(f"Error type: {type(e)}")
        
        # Log state information for debugging
        try:
            logger.error(f"State messages count: {len(state.get('messages', []))}")
            for i, msg in enumerate(state.get('messages', [])[:3]):  # Log first 3 messages
                logger.error(f"Message {i} type: {type(msg)}")
                if hasattr(msg, '__dict__'):
                    logger.error(f"Message {i} attributes: {list(msg.__dict__.keys())}")
        except Exception as debug_error:
            logger.error(f"Error during state debugging: {debug_error}")
        
        raise