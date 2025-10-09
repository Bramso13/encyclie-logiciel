import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const emails = await prisma.emailLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limiter aux 100 derniers emails
    });

    return NextResponse.json({ success: true, emails }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la récupération des emails:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des emails" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const emailLog = await prisma.emailLog.create({
      data: {
        to: body.to,
        cc: body.cc,
        subject: body.subject,
        type: body.type,
        status: body.status || "PENDING",
        htmlContent: body.htmlContent,
        textContent: body.textContent,
        hasAttachments: body.hasAttachments || false,
        attachmentNames: body.attachmentNames,
        relatedQuoteId: body.relatedQuoteId,
        relatedUserId: body.relatedUserId,
        messageId: body.messageId,
        errorMessage: body.errorMessage,
        sentById: body.sentById,
        sentAt: body.sentAt,
      },
    });

    return NextResponse.json({ success: true, emailLog }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du log email:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la création du log email" },
      { status: 500 }
    );
  }
}
