import { NextRequest, NextResponse } from "next/server";

export function assertCronSecret(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET manquant côté serveur" },
      { status: 500 },
    );
  }
  const header = request.headers.get("authorization") || "";
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json(
      { success: false, error: "Non autorisé" },
      { status: 401 },
    );
  }
  return null;
}
