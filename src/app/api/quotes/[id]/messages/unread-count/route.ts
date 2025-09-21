import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/quotes/[id]/messages/unread-count - Compteur des messages non lus pour un devis
export async function GET(
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

    const quoteId = params.id;

    // Vérifier que l'utilisateur a accès à ce devis
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { broker: true },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "Devis non trouvé" },
        { status: 404 }
      );
    }

    // Seuls le broker propriétaire et les admins peuvent voir le compteur
    if (session.user.role !== "ADMIN" && quote.brokerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Compter les messages non lus où l'utilisateur connecté est le destinataire
    const unreadCount = await prisma.quoteMessage.count({
      where: {
        quoteId,
        receiverId: session.user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: { count: unreadCount },
    });
  } catch (error) {
    console.error("Erreur lors du comptage des messages non lus:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}