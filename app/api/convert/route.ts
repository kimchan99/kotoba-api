import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// モード別のシステムプロンプト
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

  okinawa: `あなたは沖縄方言（うちなーぐち）翻訳マシンです。入力されたテキストを沖縄方言に変換してください。
ルール：
- 語尾を「〜さー」「〜よー」「〜ねー」に
- 「だからよー」「なんくるないさ」「ちゃーがんじゅー」などを適宜使う
- 「です/ます」→「〜やいびーん」、「〜している」→「〜しちょーん」
- 「ありがとう」→「にふぇーでーびる」
- 「こんにちは」→「はいさい/はいたい」
- 意味は必ず保つこと
- 翻訳結果のテキストだけを返す。説明は不要`,

  ronbun: `あなたは学術論文調翻訳マシンです。入力されたテキストを極めて硬い論文調に変換してください。
ルール：
- 「〜である」「〜と考えられる」「〜と言わざるを得ない」調
- 「前述の通り」「鑑みるに」「自明であるが」などの論文特有表現を多用
- 主語を「筆者」「当該」に置き換え
- 接続詞は「しかしながら」「したがって」「すなわち」「換言すれば」
- 註釈っぽい補足を括弧書きで入れる（例：（詳細は後述する））
- 意味は必ず保つこと
- 翻訳結果のテキストだけを返す。説明は不要`,

  kodomo: `あなたは小学生向け翻訳マシンです。入力されたテキストを小学校低学年でもわかるやさしい日本語に変換してください。
ルール：
- 漢字はなるべくひらがなに（小1〜2で習う漢字以外）
- むずかしいことばはかんたんなことばにかえる
- 一文を短くする
- 「〜だよ」「〜なんだって」「〜してみよう」などのやさしい語尾
- わかりにくい概念はたとえ話で補足
- 意味は必ず保つこと
- 翻訳結果のテキストだけを返す。説明は不要`,
};

// シンプルなレート制限（IPごとに1分あたり10リクエスト）
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

// CORS preflight
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
    // レート制限チェック
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "リクエスト多すぎ！1分待ってからもう一回試してね" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { mode, texts } = body;

    // バリデーション
    if (!mode || !PROMPTS[mode]) {
      return NextResponse.json(
        { error: "無効なモードだよ" },
        { status: 400 }
      );
    }

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: "テキストがないよ" },
        { status: 400 }
      );
    }

    // テキスト量の上限（乱用防止）
    const totalChars = texts.reduce((sum: number, t: string) => sum + t.length, 0);
    if (totalChars > 5000) {
      return NextResponse.json(
        { error: "テキストが長すぎるよ（5000文字まで）" },
        { status: 400 }
      );
    }

    // Gemini API呼び出し
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: PROMPTS[mode],
    });

    const numbered = texts.map((t: string, i: number) => `[${i}] ${t}`).join("\n");
    const userPrompt = `以下のテキストをそれぞれ変換してください。番号付きでそのまま返してください。番号のフォーマットは [0], [1], ... のまま維持してください。\n\n${numbered}`;

    const response = await model.generateContent(userPrompt);
    const result = response.response.text();

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
