import { NextRequest, NextResponse } from "next/server";

const PROMPTS: Record<string, string> = {
  gal: `ギャル語翻訳マシン。入力テキストをギャル語に変換。語尾は「〜」「ぁ」「ぃ」、「マジ」「ウケる」「やばい」「ガチで」「ワンチャン」多用。意味は保つ。翻訳結果だけ返す。`,
  ojisan: `おじさん構文翻訳マシン。入力テキストをおじさん構文に変換。絵文字過剰使用（😊💕🤣✨😆）、「〜かな❓」「〜だネ😊」「ナンチャッテ😆」、カタカナ強調。意味は保つ。翻訳結果だけ返す。`,
  yasashii: `やさしい言葉変換マシン。攻撃的・批判的・皮肉なテキストを穏やかでやさしい言葉に変換。罵倒→尊重、皮肉→誠実、暴言→建設的に。すでに穏やかならそのまま。意味は保つ。翻訳結果だけ返す。`,
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}

export async function POST(req: NextRequest) {
  try {
    const { mode, texts } = await req.json();
    if (!mode || !PROMPTS[mode]) return NextResponse.json({ error: "無効なモード" }, { status: 400 });
    if (!texts?.length) return NextResponse.json({ error: "テキストなし" }, { status: 400 });

    const numbered = texts.map((t: string, i: number) => `[${i}] ${t}`).join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: PROMPTS[mode] },
          { role: "user", content: `以下を変換。番号フォーマット[0],[1]...を維持:\n\n${numbered}` },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ result: data.choices?.[0]?.message?.content || "" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
