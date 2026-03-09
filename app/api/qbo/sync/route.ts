import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncOrganization } from '@/lib/qbo-sync';
import { QBOClient } from '@/lib/qbo-client';

export async function POST() {
  try {
    // Check for an existing org in the database
    let org = await prisma.organization.findFirst();

    // Shortcut path: if no org exists but env vars are set, bootstrap from env
    if (!org && process.env.QBO_ACCESS_TOKEN && process.env.QBO_REALM_ID) {
      const client = new QBOClient(
        process.env.QBO_ACCESS_TOKEN,
        process.env.QBO_REALM_ID
      );

      let companyName = 'Sandbox Company';
      try {
        const info = await client.getCompanyInfo();
        companyName =
          info?.CompanyInfo?.CompanyName || 'Sandbox Company';
      } catch {
        // fall through with default name
      }

      org = await prisma.organization.create({
        data: {
          name: companyName,
          qboRealmId: process.env.QBO_REALM_ID,
          accessToken: process.env.QBO_ACCESS_TOKEN,
          refreshToken: process.env.QBO_REFRESH_TOKEN || 'manual-token',
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });
    }

    if (!org) {
      return NextResponse.json(
        { error: 'No QuickBooks connection found. Connect via OAuth first.' },
        { status: 400 }
      );
    }

    // If using env token shortcut, update the token in case it changed
    if (process.env.QBO_ACCESS_TOKEN) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          accessToken: process.env.QBO_ACCESS_TOKEN,
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });
    }

    const result = await syncOrganization(org.id);

    return NextResponse.json({
      success: true,
      orgId: org.id,
      orgName: org.name,
      synced: result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
