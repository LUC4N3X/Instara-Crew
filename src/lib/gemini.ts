import { GoogleGenAI, Type } from "@google/genai";

export type GeminiPack = {
  analysis: {
    summary: string;
    visualElements: string[];
    mood: string;
  };
  comments: string[];
};

function client() {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is missing.");

  return new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION || "global",
  });
}

function normalizeKey(text: string) {
  return text
    .toLocaleLowerCase("it-IT")
    .replace(/[\p{P}\p{S}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPrompt(input: {
  quantity: number;
  tone: string;
  context?: string;
  avoid: string[];
}) {
  const avoidBlock = input.avoid.length
    ? `
Commenti gia' usati che NON devi ripetere ne' parafrasare:
${input.avoid.map((x) => `- ${x}`).join("\n")}
`
    : "";

  return `
Analizza l'immagine e prepara suggerimenti di commento in italiano.

Genera esattamente ${input.quantity} commenti DISTINTI tra loro.
Ogni commento sara' pubblicato da un account diverso: devono sembrare scritti
da persone diverse, quindi varia lessico, struttura, lunghezza e punteggiatura.
Tono: ${input.tone}.
Contesto operativo: ${input.context?.trim() || "(nessuno)"}.
${avoidBlock}
Regole:
- riferisciti solo a elementi visibili o chiaramente desumibili dall'immagine;
- non inventare luogo, relazione personale, professione o evento;
- non inferire caratteristiche sensibili;
- evita commenti sessualizzanti o invasivi;
- niente hashtag, link, pubblicita' o call-to-action;
- niente "scrivimi", "DM", "ti seguo";
- non fingere conoscenza personale;
- nessun commento identico o quasi identico a un altro;
- prevalentemente 2-10 parole;
- emoji solo in alcuni commenti, massimo una per commento.

Restituisci JSON valido.
`;
}

export async function generateCommentsFromImage(input: {
  bytes: Buffer;
  mimeType: string;
  quantity: number;
  tone: string;
  context?: string;
}): Promise<GeminiPack> {
  if (input.quantity < 1 || input.quantity > 100) {
    throw new Error("Quantity must be between 1 and 100.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const ai = client();

  const seen = new Set<string>();
  const comments: string[] = [];
  let analysis: GeminiPack["analysis"] | null = null;

  for (let round = 0; round < 4 && comments.length < input.quantity; round++) {
    const missing = input.quantity - comments.length;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPrompt({
                quantity: missing,
                tone: input.tone,
                context: input.context,
                avoid: comments,
              }),
            },
            {
              inlineData: {
                mimeType: input.mimeType,
                data: input.bytes.toString("base64"),
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                visualElements: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                mood: { type: Type.STRING },
              },
              required: ["summary", "visualElements", "mood"],
            },
            comments: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["analysis", "comments"],
        },
        temperature: Math.min(1.3, 0.9 + round * 0.15),
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Gemini returned an empty response.");

    const parsed = JSON.parse(raw) as GeminiPack;
    analysis = analysis ?? parsed.analysis;

    for (const candidate of parsed.comments ?? []) {
      const text = candidate.trim();
      if (!text) continue;
      const key = normalizeKey(text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      comments.push(text);
      if (comments.length === input.quantity) break;
    }
  }

  if (!analysis) throw new Error("Gemini returned no analysis.");
  if (comments.length === 0) throw new Error("Gemini returned no usable comments.");

  return { analysis, comments };
}
