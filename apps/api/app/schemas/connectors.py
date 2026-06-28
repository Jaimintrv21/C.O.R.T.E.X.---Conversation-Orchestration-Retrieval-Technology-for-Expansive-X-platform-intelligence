from pydantic import BaseModel

class ExportInstructions(BaseModel):
    steps: list[str]
    settings_url_hint: str | None = None
    file_format_note: str
    typical_wait_time: str | None = None

class ConnectorDefinition(BaseModel):
    id: str
    display_name: str
    logo: str | None = None
    available_methods: list[str]
    file_import_parser: str | None = None
    export_instructions: ExportInstructions | None = None

CONNECTOR_REGISTRY = {
    "chatgpt": ConnectorDefinition(
        id="chatgpt",
        display_name="OpenAI (ChatGPT)",
        available_methods=["api_key", "extension", "file_import"],
        file_import_parser="chatgpt",
        export_instructions=ExportInstructions(
            steps=[
                "Open ChatGPT and go to Settings",
                "Select Data Controls",
                "Click Export Data and confirm",
                "Check your email for a download link from OpenAI",
                "Download the .zip file and upload it below",
            ],
            settings_url_hint="Settings → Data Controls → Export",
            file_format_note="A .zip file containing conversations.json",
            typical_wait_time="Usually arrives within a few minutes, can take longer",
        )
    ),
    "claude": ConnectorDefinition(
        id="claude",
        display_name="Anthropic (Claude)",
        available_methods=["api_key", "extension", "file_import"],
        file_import_parser="claude",
        export_instructions=ExportInstructions(
            steps=[
                "Go to Claude.ai and click on your profile in the bottom left",
                "Select Settings",
                "Go to Account and scroll to Export data",
                "Click Export and download the file",
            ],
            settings_url_hint="Settings → Account → Export data",
            file_format_note="A .zip file containing your account data",
            typical_wait_time="Usually arrives within a few minutes",
        )
    ),
    "gemini": ConnectorDefinition(
        id="gemini",
        display_name="Google (Gemini)",
        available_methods=["extension", "file_import"],
        file_import_parser="gemini",
        export_instructions=ExportInstructions(
            steps=[
                "Go to Google Takeout (takeout.google.com)",
                "Deselect all, then select only 'Gemini Apps Activity'",
                "Choose export type and frequency, then click Create export",
                "Wait for Google's email notifying you the export is ready",
                "Download and upload the resulting file below",
            ],
            settings_url_hint="Google Takeout → Gemini Apps Activity",
            file_format_note="An archive containing your activity data in JSON or HTML",
            typical_wait_time="Can take anywhere from minutes to a day depending on data size",
        )
    ),
    "grok": ConnectorDefinition(
        id="grok",
        display_name="Grok (xAI)",
        available_methods=["api_key", "extension"],
        file_import_parser=None,
        export_instructions=None
    ),
    "perplexity": ConnectorDefinition(
        id="perplexity",
        display_name="Perplexity API",
        available_methods=["api_key", "extension"],
        file_import_parser=None,
        export_instructions=None
    ),
    "ollama": ConnectorDefinition(
        id="ollama",
        display_name="Ollama Local",
        available_methods=["api_key"],
        file_import_parser=None,
        export_instructions=None
    ),
}
