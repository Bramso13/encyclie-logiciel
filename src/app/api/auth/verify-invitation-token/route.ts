import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Token manquant",
        },
        { status: 400 }
      );
    }

    // Vérifier le token dans la base de données
    const invitation = await prisma.brokerInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "Token d'invitation invalide",
        },
        { status: 400 }
      );
    }

    // Vérifier si le token a expiré
    if (invitation.expires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "L'invitation a expiré",
        },
        { status: 400 }
      );
    }

    // Vérifier si le token a déjà été utilisé
    if (invitation.used) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette invitation a déjà été utilisée",
        },
        { status: 400 }
      );
    }

    // Vérifier si un utilisateur avec cet email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Un compte existe déjà avec cet email",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        name: invitation.name,
        email: invitation.email,
        companyName: invitation.companyName,
        phone: invitation.phone,
        address: invitation.address,
        siretNumber: invitation.siretNumber,
        brokerCode: invitation.brokerCode,
      },
    });
  } catch (error) {
    console.error("Error verifying invitation token:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la vérification du token d'invitation",
      },
      { status: 500 }
    );
  }
}


