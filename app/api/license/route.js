import { NextResponse } from "next/server";
import { getLicenseStatus, activateLicense, deactivateLicense } from "../_license";

/**
 * GET /api/license/
 * Returns current license verification status.
 * Never exposes the raw purchase code.
 */
export async function GET() {
  const status = await getLicenseStatus();
  return NextResponse.json(status);
}

/**
 * POST /api/license/
 * License checks are disabled. This endpoint always returns success.
 */
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.action === "deactivate") {
    deactivateLicense();
    return NextResponse.json({ success: true, message: "License check disabled." });
  }

  const result = await activateLicense(body.purchase_code);
  return NextResponse.json(result, { status: 200 });
}
