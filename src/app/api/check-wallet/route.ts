import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
  }

  try {
    const r = await fetch(
      `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${wallet}`
    );

    if (!r.ok) {
      return NextResponse.json(
        { error: `Remote API error ${r.status}` },
        { status: r.status }
      );
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Proxy error:", err);
    return NextResponse.json(
      { error: "Proxy failed", details: err.message },
      { status: 500 }
    );
  }
}

