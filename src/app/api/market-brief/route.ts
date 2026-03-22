import { NextRequest, NextResponse } from "next/server";

interface MarketBriefRequest {
  news: any[];
  economic: any[];
  earnings: any[];
  userTickers: string[];
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          brief:
            "**Market Brief Unavailable**\n\n" +
            "The Anthropic API key is not configured. To enable AI-generated market briefs, " +
            "add ANTHROPIC_API_KEY to your environment variables (.env.local).\n\n" +
            "You can get an API key at https://console.anthropic.com/",
          generatedAt: new Date().toISOString(),
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }
      );
    }

    const body: MarketBriefRequest = await req.json();
    const { news = [], economic = [], earnings = [], userTickers = [], tickers = [] } = body as any;
    const resolvedTickers = userTickers.length > 0 ? userTickers : tickers;

    const userPrompt = buildPrompt(news, economic, earnings, resolvedTickers);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:
          "You are a concise financial analyst. Write a daily market brief for a private wealth dashboard. Be direct, factual, and actionable. Use plain text with ** for bold headers. No fluff.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errorBody = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errorBody);
      return NextResponse.json(
        { error: "Failed to generate market brief", details: errorBody },
        {
          status: 502,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }
      );
    }

    const data = await anthropicRes.json();
    const brief =
      data.content?.[0]?.text ?? "Unable to extract brief from response.";

    return NextResponse.json(
      { brief, generatedAt: new Date().toISOString() },
      {
        status: 200,
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      }
    );
  } catch (err: any) {
    console.error("Market brief route error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      {
        status: 500,
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      }
    );
  }
}

function buildPrompt(
  news: any[],
  economic: any[],
  earnings: any[],
  userTickers: string[]
): string {
  const sections: string[] = [];

  sections.push("Generate a daily market brief with the following sections:");
  sections.push("1. **Market Pulse** — 2-3 sentence overview of today's market mood");
  sections.push("2. **Key Headlines** — Top 3-5 most impactful news items, one line each");
  sections.push("3. **Earnings Watch** — Notable upcoming/recent earnings (if any)");
  sections.push("4. **Macro Radar** — Important economic events coming up");
  sections.push("5. **Your Portfolio** — Any news/earnings relevant to the user's tickers");
  sections.push("6. **Action Items** — 2-3 specific things to watch or consider");
  sections.push("");

  if (news.length > 0) {
    sections.push("--- NEWS DATA ---");
    sections.push(JSON.stringify(news.slice(0, 20), null, 2));
    sections.push("");
  } else {
    sections.push("--- NEWS DATA ---");
    sections.push("No news data available. Note this in the brief.");
    sections.push("");
  }

  if (economic.length > 0) {
    sections.push("--- ECONOMIC CALENDAR ---");
    sections.push(JSON.stringify(economic.slice(0, 15), null, 2));
    sections.push("");
  } else {
    sections.push("--- ECONOMIC CALENDAR ---");
    sections.push("No economic data available.");
    sections.push("");
  }

  if (earnings.length > 0) {
    sections.push("--- EARNINGS DATA ---");
    sections.push(JSON.stringify(earnings.slice(0, 15), null, 2));
    sections.push("");
  } else {
    sections.push("--- EARNINGS DATA ---");
    sections.push("No earnings data available.");
    sections.push("");
  }

  if (userTickers.length > 0) {
    sections.push("--- USER PORTFOLIO TICKERS ---");
    sections.push(userTickers.join(", "));
    sections.push("");
  } else {
    sections.push("--- USER PORTFOLIO TICKERS ---");
    sections.push("No tickers provided. Skip the portfolio section.");
    sections.push("");
  }

  return sections.join("\n");
}
