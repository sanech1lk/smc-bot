import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return apiError("pushNotConfigured", 503);
  }
  return NextResponse.json({ publicKey });
}
