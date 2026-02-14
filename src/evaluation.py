"""Azure AI Evaluation integration for Social AI Studio.

Provides quality scoring of generated content using Azure AI Evaluation SDK.
Evaluates: Relevance, Coherence, Fluency, Groundedness.

Usage:
    from src.evaluation import evaluate_content, is_configured
    if is_configured():
        scores = await evaluate_content(query="...", response="...", context="...")
"""

import logging
from importlib.util import find_spec

from src.config import EVAL_API_VERSION, EVAL_AZURE_ENDPOINT, EVAL_MODEL_DEPLOYMENT, EVAL_TOKEN_SCOPE

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    """Check if evaluation SDK prerequisites are available."""
    return find_spec("azure.ai.evaluation") is not None and bool(EVAL_AZURE_ENDPOINT)


async def evaluate_content(
    query: str,
    response: str,
    context: str | None = None,
) -> dict[str, float | str]:
    """Evaluate generated content quality using Azure AI Evaluation.

    Runs Relevance, Coherence, and Fluency evaluators.
    Optionally runs Groundedness if context is provided.

    Args:
        query: The original user query / topic.
        response: The generated content to evaluate.
        context: Optional grounding context (brand guidelines, web search results).

    Returns:
        Dictionary with metric scores (1-5 scale) and reasons.
    """
    results: dict[str, float | str] = {}

    try:
        from azure.ai.evaluation import CoherenceEvaluator, FluencyEvaluator, RelevanceEvaluator
        from azure.core.exceptions import ClientAuthenticationError, HttpResponseError
        from azure.identity import CredentialUnavailableError

        # Model config for AI-assisted evaluators
        model_config = {
            "azure_endpoint": EVAL_AZURE_ENDPOINT,
            "azure_deployment": EVAL_MODEL_DEPLOYMENT,
            "api_version": EVAL_API_VERSION,
        }

        # Authenticate with DefaultAzureCredential via api_key (AAD token).
        # The cognitiveservices scope works on the resource-level endpoint.
        try:
            from azure.identity import DefaultAzureCredential

            credential = DefaultAzureCredential()
            token = credential.get_token(EVAL_TOKEN_SCOPE)
            model_config["api_key"] = token.token
        except (ClientAuthenticationError, CredentialUnavailableError, ValueError, RuntimeError) as e:
            logger.warning("Failed to get credential for evaluation: %s", e)
            return {"error": f"Authentication failed: {e}"}

        # Run evaluators — collect errors per metric for diagnostics
        evaluators = {
            "relevance": RelevanceEvaluator(model_config=model_config),
            "coherence": CoherenceEvaluator(model_config=model_config),
            "fluency": FluencyEvaluator(model_config=model_config),
        }

        eval_errors: list[str] = []
        for name, evaluator in evaluators.items():
            try:
                result = evaluator(query=query, response=response)
                logger.info("Evaluator '%s' raw result: %s", name, result)
                score = result.get(name)
                reason = result.get(f"{name}_reason", "")
                if score is not None:
                    results[name] = float(score)
                if reason:
                    results[f"{name}_reason"] = reason
            except (HttpResponseError, ValueError, RuntimeError, TypeError) as e:
                logger.warning("Evaluator '%s' failed: %s", name, e, exc_info=True)
                results[name] = -1
                eval_errors.append(f"{name}: {e}")

        # If ALL evaluators failed, return error with details
        core_metrics = ["relevance", "coherence", "fluency"]
        if all(results.get(m) == -1 for m in core_metrics):
            error_detail = "; ".join(eval_errors) if eval_errors else "All evaluators returned -1"
            logger.error("All evaluators failed: %s", error_detail)
            return {"error": f"All evaluators failed: {error_detail}"}

        # Groundedness requires context
        if context:
            try:
                from azure.ai.evaluation import GroundednessEvaluator

                groundedness = GroundednessEvaluator(model_config=model_config)
                result = groundedness(response=response, context=context)
                score = result.get("groundedness")
                reason = result.get("groundedness_reason", "")
                if score is not None:
                    results["groundedness"] = float(score)
                if reason:
                    results["groundedness_reason"] = reason
            except (HttpResponseError, ValueError, RuntimeError, TypeError) as e:
                logger.warning("Groundedness evaluator failed: %s", e)

    except ImportError:
        logger.warning("azure-ai-evaluation not installed — run: uv add azure-ai-evaluation")
        results["error"] = "azure-ai-evaluation not installed"
    except (ValueError, RuntimeError, TypeError) as e:
        logger.error("Evaluation failed: %s", e, exc_info=True)
        results["error"] = str(e)

    return results


def format_evaluation_summary(scores: dict[str, float | str]) -> str:
    """Format evaluation scores into a human-readable summary.

    Args:
        scores: Dictionary from evaluate_content().

    Returns:
        Formatted string for display.
    """
    if "error" in scores:
        return f"Evaluation unavailable: {scores['error']}"

    lines = ["📊 Foundry Evaluation Scores:"]
    metric_labels = {
        "relevance": "Relevance",
        "coherence": "Coherence",
        "fluency": "Fluency",
        "groundedness": "Groundedness",
    }

    total = 0.0
    count = 0
    for key, label in metric_labels.items():
        score = scores.get(key)
        if isinstance(score, (int, float)) and score > 0:
            stars = "★" * int(score) + "☆" * (5 - int(score))
            lines.append(f"  {label}: {score:.1f}/5 {stars}")
            total += score
            count += 1

    if count > 0:
        avg = total / count
        lines.append(f"  Overall: {avg:.1f}/5")

    return "\n".join(lines)
