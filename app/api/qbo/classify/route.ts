import { NextRequest, NextResponse } from 'next/server';
import { classifyOrganization } from '@/lib/990/classify';
import { invalidate990Cache } from '@/lib/pipeline/map990';
import { getUserOrg } from '@/lib/get-user-org';

const activeClassifications = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const { org, error } = await getUserOrg();

    if (!org) {
      return NextResponse.json(
        { error: error || 'No QuickBooks connection found. Sync data first.' },
        { status: 400 }
      );
    }

    if (activeClassifications.has(org.id)) {
      return NextResponse.json(
        { error: 'Classification already in progress for this organization.' },
        { status: 409 }
      );
    }

    let force = false;
    try {
      const body = await request.json();
      force = body?.force === true;
    } catch {
      // No body or invalid JSON — use defaults
    }

    activeClassifications.add(org.id);

    try {
      const summary = await classifyOrganization(org.id, { force });
      invalidate990Cache(org.id);

      return NextResponse.json({
        success: true,
        orgId: org.id,
        orgName: org.name,
        ...summary,
      });
    } finally {
      activeClassifications.delete(org.id);
    }
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      {
        error: 'Classification failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
