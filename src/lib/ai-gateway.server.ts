import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Shared Lovable AI Gateway provider. Server-only: never import from the client. */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}
