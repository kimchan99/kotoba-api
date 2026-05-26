import { NextRequest, NextResponse } from "next/server";

const PROMPTS: Record<string, string> = {
  gal: `あなたはギャル語翻訳マシンです。入力されたテキストを全てギャル語に変換してください。
ルール：
- 語尾を「〜」「ぁ」「ぃ」「ぅ」などに変える
- 「マジ」「ウケる」「やばい」「てか」「〜じゃん」「〜っしょ」などを多用
- カタカナ語を積極的に使う（「リアルに」「ガチで」「ワンチャン」）
- 「っ」を多用して勢いを出す
- 意味は必ず保つこと。情報を消さないこと
- 翻訳結果のテキストだけを返す。説明は不要`,

  ojisan: `あなたはおじさん構文翻訳マシンです。入力されたテキストを全ておじさん構文に変換してください。
ルール：
- 絵文字を過剰に使う（😊💕🤣✨😆🥺👍❗）
- 「〜かな❓」「〜だネ😊」「ナンチャッテ😆」を多用
- カタカナでの強調（「トッテモ」「オジサン的には」）
- 唐突な自分語り（「おじさんも昔は〜」）
- 句読点を多用し、一文を短くする
- 意味は必ず保つこと
- 翻訳結果のテキストだけを返す。説明は不要`,

  yasashii: `あなたは「やさしい言葉変換マシン」です。攻撃的・批判的・皮肉・煽りなどのネガティブなテキストを、同じ意味を保ったまま穏やかでやさしい言葉に変換してください。
ルール：
- 攻撃的な表現 → 建設的で思いやりのある表現に
- 罵倒・暴言 → 相手を尊重した言い方に
- 皮肉・嫌味 → ストレートで誠実な言い方に
- 「死ね」「消えろ」等 → 「少し距離を置きたいな」等
- 「バカじゃないの」 → 「もう少し考えてみない？」等
- 「は？意味わからん」 → 「ごめん、もう少し教えてもらえる？」等
- すでに穏やかなテキストはそのままでOK
- 意味は必ず保つこと
- 翻訳結果のテキストだけを返す。説明は不要`,
};

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "リクエスト多すぎ！1分待ってからもう一回試してね" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { mode, texts } = body;

    if (!mode || !PROMPTS[mode]) {
      return NextResponse.json({ error: "無効なモードだよ" }, { status: 400 });
    }

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: "テキストがないよ" }, { status: 400 });
    }

    const totalChars = texts.reduce((sum: number, t: string) => sum + t.length, 0);
    if (totalChars > 5000) {
      return NextResponse.json(
        { error: "テキストが長すぎるよ（5000文字まで）" },
        { status: 400 }
      );
    }

    const numbered = texts.map((t: string, i: number) => `[${i}] ${t}`).join("\n");
    const userPrompt = `以下のテキストをそれぞれ変換してください。番号付きでそのまま返してください。番号のフォーマットは [0], [1], ... のまま維持してください。\n\n${numbered}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: PROMPTS[mode] },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq API error:", response.status, err);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ result });
  } catch (err: unknown) {
    console.error("API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `サーバーエラー: ${errorMessage}` },
      { status: 500 }
    );
  }
}
