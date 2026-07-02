import { NextRequest, NextResponse } from "next/server";
import {
  generateAgronomAnswer,
  streamAgronomAnswer,
} from "@/server/services/agronomService";
import { validateAgronomBody } from "@/lib/agronom/validate";
import { checkRateLimit, getClientIp } from "@/lib/agronom/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_MESSAGE =
  "Kechirasiz, hozir javob berishda muammo bo'ldi. Iltimos, qayta urinib ko'ring.";

const RATE_LIMIT_MESSAGE =
  "Juda ko'p so'rov yuborildi. Iltimos, 15 daqiqadan keyin qayta urinib ko'ring.";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const body = await request.json();
    const validated = validateAgronomBody(body);

    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: validated.status }
      );
    }

    const wantsStream =
      request.nextUrl.searchParams.get("stream") === "true" ||
      request.headers.get("accept") === "text/event-stream";

    if (wantsStream) {
      const encoder = new TextEncoder();
      let fullAnswer = "";

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamAgronomAnswer(validated.data)) {
              fullAnswer += chunk;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: chunk })}\n\n`
                )
              );
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, answer: fullAnswer })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (error) {
            console.error("[agronom/stream] Error:", error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: ERROR_MESSAGE })}\n\n`
              )
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const answer = await generateAgronomAnswer(validated.data);
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("[agronom] Error:", error);

    const isConfigError =
      error instanceof Error && error.message.includes("OPENAI_API_KEY");

    return NextResponse.json(
      { error: ERROR_MESSAGE },
      { status: isConfigError ? 503 : 500 }
    );
  }
}
