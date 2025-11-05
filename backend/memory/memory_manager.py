import os
import redis
import json
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType,
)
from sentence_transformers import SentenceTransformer
import uuid
from datetime import datetime
from typing import List, Dict, Optional
import hashlib

logger = logging.getLogger(__name__)


class MemoryManager:
    def __init__(
        self,
        qdrant_url: str,
        api_key: str,
        redis_url: str,
        redis_port: int,
        redis_username: str,
        redis_password: str,
        short_term_window: int = 10,
        collection_name: str = "long_term_memory_collection",
    ):
        self.collection_name = collection_name
        self.short_term_window = short_term_window
        self.redis_url = redis_url

        self.redis_client = redis.Redis(
            host=redis_url,
            port=redis_port,
            decode_responses=True,
            username=redis_username,
            password=redis_password,
        )

        self.qdrant_client = QdrantClient(url=qdrant_url, api_key=api_key)
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

        self._initialize_collection()

    def _initialize_collection(self):
        """Initialize Qdrant collection with proper vector configuration"""
        try:
            collections = self.qdrant_client.get_collections().collections
            collection_exists = any(c.name == self.collection_name for c in collections)

            if not collection_exists:
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
                )
                logger.info(f"Created collection: {self.collection_name}")

            self.qdrant_client.create_payload_index(
                collection_name=self.collection_name,
                field_name="user_id_hash",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            logger.info("Created index for 'user_id_hash'")

        except Exception as e:
            logger.error(f"Error initializing collection: {e}")

    def _get_short_term_memory_key(self, user_id_hash: str) -> str:
        """Generate Redis key for user's short-term memory"""
        return f"memory:short_term:{user_id_hash}"

    def save_to_short_term_memory(
        self, input_text: str, output_text: str, user_id: str
    ):
        """Save conversation to Redis-based short-term memory"""
        try:
            user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
            key = self._get_short_term_memory_key(user_id_hash)

            conversation = {
                "user": input_text,
                "assistant": output_text,
                "timestamp": datetime.now().isoformat(),
            }

            self.redis_client.lpush(key, json.dumps(conversation))
            self.redis_client.ltrim(key, 0, self.short_term_window - 1)
            self.redis_client.expire(key, 86400)

            logger.info(
                f"Saved conversation to short-term memory. Current count: {self.redis_client.llen(key)}"
            )

        except Exception as e:
            logger.error(f"Error saving to short-term memory: {e}")

    def get_from_short_term_memory(self, user_id: str) -> List[Dict]:
        """Retrieve conversations from Redis-based short-term memory"""
        try:
            user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
            key = self._get_short_term_memory_key(user_id_hash)

            if not self.redis_client.exists(key):
                return []

            conversations = self.redis_client.lrange(key, 0, -1)

            parsed_conversations = []
            for conv in reversed(conversations):
                try:
                    parsed_conversations.append(json.loads(conv))
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing conversation JSON: {e}")
                    continue

            logger.info(
                f"Retrieved {len(parsed_conversations)} conversations from short-term memory"
            )
            return parsed_conversations

        except Exception as e:
            logger.error(f"Error retrieving short-term memory: {e}")
            return []

    def get_short_term_memory_count(self, user_id: str) -> int:
        """Get the current count of messages in short-term memory"""
        try:
            user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
            key = self._get_short_term_memory_key(user_id_hash)
            return self.redis_client.llen(key)
        except Exception as e:
            logger.error(f"Error getting short-term memory count: {e}")
            return 0

    def clear_short_term_memory(self, user_id: str):
        """Clear user's short-term memory from Redis"""
        try:
            user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
            key = self._get_short_term_memory_key(user_id_hash)
            deleted_count = self.redis_client.delete(key)
            logger.info(f"Cleared short-term memory for user. Deleted {deleted_count} key(s)")
        except Exception as e:
            logger.error(f"Error clearing short-term memory: {e}")

    def save_to_long_term_memory(self, input_text: str, output_text: str, user_id: str):
        """
        Save important conversations to long-term memory in Qdrant

        Args:
            input_text: User input
            output_text: Assistant output
            user_id: User identifier
        """
        try:
            user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
            conversation_text = f"User: {input_text}\nAssistant: {output_text}"

            embedding = self.embedding_model.encode(conversation_text).tolist()

            payload = {
                "user_id_hash": user_id_hash,
                "timestamp": datetime.now().isoformat(),
                "conversation_text": conversation_text,
            }

            point_id = str(uuid.uuid4())

            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=[PointStruct(id=point_id, vector=embedding, payload=payload)],
            )

            return point_id

        except Exception as e:
            logger.error(f"Error saving to long-term memory: {e}")
            return None

    def search_long_term_memory(
        self, query: str, user_id: str, limit: int = 3, score_threshold: float = 0.7
    ) -> List[Dict]:
        """
        Search long-term memory for relevant conversations

        Args:
            query: Search query
            user_id: User identifier
            limit: Maximum number of results
            score_threshold: Minimum similarity score

        Returns:
            List of relevant conversations with metadata
        """
        try:
            user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
            query_embedding = self.embedding_model.encode(query).tolist()

            search_results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                query_filter=Filter(
                    must=[
                        FieldCondition(
                            key="user_id_hash",
                            match=MatchValue(value=user_id_hash),
                        )
                    ]
                ),
                limit=limit,
                score_threshold=score_threshold,
            )

            results = []
            for result in search_results:
                results.append(
                    {
                        "conversation_text": result.payload.get("conversation_text"),
                        "timestamp": result.payload.get("timestamp"),
                        "score": result.score,
                    }
                )

            return results

        except Exception as e:
            logger.error(f"Error searching long-term memory: {e}")
            return []

    def delete_user_data(self, user_id: str):
        """Delete all data for this user (GDPR compliance)"""
        try:
            user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()

            self.qdrant_client.delete(
                collection_name=self.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="user_id_hash",
                            match=MatchValue(value=user_id_hash),
                        )
                    ]
                ),
            )

            self.clear_short_term_memory(user_id)

            logger.info(f"All data deleted for user hash: {user_id_hash}")

        except Exception as e:
            logger.error(f"Error deleting user data: {e}")
