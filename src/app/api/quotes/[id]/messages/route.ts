import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/quotes/[id]/messages - Récupérer les messages d'un devis
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

    // Seuls le broker propriétaire et les admins peuvent voir les messages
    if (session.user.role !== "ADMIN" && quote.brokerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Récupérer tous les messages du devis
    const messages = await prisma.quoteMessage.findMany({
      where: { quoteId },
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
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/quotes/[id]/messages - Envoyer un nouveau message
export async function POST(
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
    const { content, receiverId } = await request.json();

    if (!content?.trim() || !receiverId) {
      return NextResponse.json(
        { success: false, error: "Contenu et destinataire requis" },
        { status: 400 }
      );
    }

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

    // Seuls le broker propriétaire et les admins peuvent envoyer des messages
    if (session.user.role !== "ADMIN" && quote.brokerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Vérifier que le destinataire existe
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { success: false, error: "Destinataire non trouvé" },
        { status: 404 }
      );
    }

    // Créer le message
    const message = await prisma.quoteMessage.create({
      data: {
        content: content.trim(),
        quoteId,
        senderId: session.user.id,
        receiverId,
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
      data: message,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}