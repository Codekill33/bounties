import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth-utils";
import { getCurrentUser } from "@/lib/server-auth";
import type { AdminDisputeDto, DisputeReasonEnum } from "@/lib/graphql/generated";

/**
 * POST /api/disputes
 *
 * Creates a new dispute for a bounty. Forwards the request to the backend
 * GraphQL API once a raiseDispute mutation is available, or to the REST
 * endpoint in the interim.
 *
 * Body:
 *   campaignId  – ID of the bounty being disputed
 *   reason      – DisputeReasonEnum value
 *   description – Free-text explanation from the filer
 *
 * Returns the created AdminDisputeDto (including its `id`).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, reason, description } = body as {
      campaignId?: string;
      reason?: DisputeReasonEnum;
      description?: string;
    };

    // Input validation
    if (!campaignId || typeof campaignId !== "string") {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    }
    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 },
      );
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 },
      );
    }

    // Forward to the backend REST API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API URL not configured" },
        { status: 500 },
      );
    }

    const token = await getAccessToken();

    const backendResponse = await fetch(`${backendUrl}/disputes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        campaignId,
        reason,
        description,
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("Backend dispute creation failed:", errorText);
      return NextResponse.json(
        { error: "Failed to create dispute" },
        { status: backendResponse.status },
      );
    }

    const dispute = (await backendResponse.json()) as AdminDisputeDto;
    return NextResponse.json(dispute, { status: 201 });
  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 },
    );
  }
}
