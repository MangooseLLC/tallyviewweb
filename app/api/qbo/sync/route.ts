import { getUserOrg } from '@/lib/get-user-org';
import { syncOrganizationStreamed } from '@/lib/qbo-sync';

export async function POST() {
  try {
    const { org, error } = await getUserOrg();

    if (!org) {
      return Response.json(
        { error: error || 'No organization found. Please complete onboarding first.' },
        { status: 400 }
      );
    }

    if (!org.qboRealmId) {
      return Response.json(
        { error: 'No QuickBooks connection found. Connect via OAuth first.' },
        { status: 400 }
      );
    }

    const orgId = org.id;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          await syncOrganizationStreamed(orgId, send);
        } catch (error) {
          send({
            type: 'error',
            message:
              error instanceof Error ? error.message : String(error),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
