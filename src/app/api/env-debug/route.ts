import { NextResponse } from "next/server";

export async function GET() {
  const keys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];

  const masked = keys.reduce<Record<string, string>>((acc, k) => {
    const v = process.env[k];
    acc[k] = v ? (v.length > 8 ? `${v.slice(0, 4)}...${v.slice(-4)}` : v) : "<missing>";
    return acc;
  }, {});

  return NextResponse.json({ env: masked });
}
