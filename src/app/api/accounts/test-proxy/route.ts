import { z } from "zod";
import { testProxyConnection } from "@/lib/proxy";

const testSchema = z.object({
  proxyUrl: z.string().trim().min(1, "Inserisci un URL proxy."),
});

export async function POST(request: Request) {
  let input: z.infer<typeof testSchema>;
  try {
    input = testSchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message || "URL proxy richiesto." : "Dati non validi.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const result = await testProxyConnection(input.proxyUrl);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
