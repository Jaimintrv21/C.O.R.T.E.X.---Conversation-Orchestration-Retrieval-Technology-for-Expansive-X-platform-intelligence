import json

from app.providers.chatgpt.v1 import ChatGPTv1Parser
from app.providers.registry import detect_provider


def test_chatgpt_parser_uses_strict_raw_contract() -> None:
    raw = json.dumps(
        [
            {
                "id": "conv-1",
                "title": "Demo",
                "mapping": {
                    "node-1": {
                        "id": "node-1",
                        "parent": None,
                        "message": {
                            "author": {"role": "user"},
                            "content": {"parts": ["Hello"]},
                            "metadata": {},
                        },
                    }
                },
            }
        ]
    ).encode("utf-8")

    parser = detect_provider(raw)
    conversations = ChatGPTv1Parser().parse(raw)

    assert parser is not None
    assert parser.slug == "chatgpt"
    assert conversations[0].messages[0].content == "Hello"
