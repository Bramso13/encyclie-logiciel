import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PUT /api/quote-messages/[id]/read - Marquer un message comme lu
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    const messageId = params.id;

    // Vérifier que le message existe et que l'utilisateur est le destinataire
    const message = await prisma.quoteMessage.findUnique({
      where: { id: messageId },
      include: {
        quote: {
          include: { broker: true },
        },
        sender: true,
        receiver: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message non trouvé" },
        { status: 404 }
      );
    }

    // Seul le destinataire peut marquer le message comme lu
    if (message.receiverId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur a accès au devis
    if (
      session.user.role !== "ADMIN" &&
      message.quote.brokerId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Marquer comme lu
    const updatedMessage = await prisma.quoteMessage.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        attachments: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Erreur lors du marquage comme lu:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}