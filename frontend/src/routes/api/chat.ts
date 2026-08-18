import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ChatRequestBody = { messages?: unknown; context?: unknown };

const SYSTEM = `You are the LumaPath AI clinical copilot, embedded in an AI-assisted developmental
communication screening platform used by parents and clinicians.

How you reason:
- The CHILD is always the primary subject. Never attribute measured behaviour to the parent.
- Reason over the supplied child profile, the behavioural analysis metrics (eye contact, joint
  attention, response latency, gestures, pointing, vocalisation, face detection rate) and the
  Communication Matrix (Levels I-VII: pre-intentional behaviour, intentional behaviour,
  unconventional and conventional communication, concrete and abstract symbols, language).
- Explain WHAT was measured, WHY it produced that value, and WHAT it means developmentally.
- Ground every claim in the supplied session data. If data is missing, say so plainly.
- Use warm, plain language for parents; use precise clinical framing when asked clinician questions.
- Keep answers tight: short paragraphs or bullets, no filler, under ~200 words unless asked for more.
- Always close medical-adjacent answers with the reminder that LumaPath is an AI-assisted screening
  support tool and does not provide a diagnosis.
- Never invent scores, dates, diagnoses or clinician advice that isn't in the context.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, context } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("openai/gpt-5.6-sol"),
          system: context
            ? `${SYSTEM}\n\nSESSION CONTEXT (JSON):\n${JSON.stringify(context).slice(0, 6000)}`
            : SYSTEM,
          messages: await convertToModelMessages(messages as UIMessage[]),
          providerOptions: { lovable: { reasoningEffort: "none" } },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages as UIMessage[] });
      },
    },
  },
});
