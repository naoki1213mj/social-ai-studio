"""Social AI Studio — AI-Powered Social Media Content Studio.

A reasoning agent backend built with Microsoft Foundry (agent-framework-core)
for the Agents League @ TechConnect 2026 hackathon.

Architecture:
    - Single gpt-5.2 reasoning agent with 7 tools
    - SSE streaming via FastAPI
    - 3-phase reasoning: CoT → ReAct → Self-Reflection
    - CI/CD: GitHub Actions (lint → test → build → deploy → security scan)
"""

__version__ = "0.4.0"
