import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Token et mot de passe requis",
        },
        { status: 400 }
      );
    }

    // Validation du mot de passe
    const passwordValidation = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const isPasswordValid = Object.values(passwordValidation).every(Boolean);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Le mot de passe ne respecte pas les critères de sécurité",
        },
        { status: 400 }
      );
    }

    // Vérifier le token d'invitation
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

    // Créer l'utilisateur avec Better Auth
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: invitation.name,
        email: invitation.email,
        password: password,
        role: "BROKER",
        companyName: invitation.companyName,
        phone: invitation.phone,
        address: invitation.address,
        siretNumber: invitation.siretNumber,
        isActive: true,
      },
    });

    if (!signUpResult || !signUpResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la création du compte",
        },
        { status: 500 }
      );
    }

    // Créer le profil courtier et marquer l'invitation comme utilisée
    await prisma.$transaction(async (tx) => {
      // Créer le profil courtier
      await tx.brokerProfile.create({
        data: {
          userId: signUpResult.user.id,
          code: invitation.brokerCode,
        },
      });

      // Marquer l'invitation comme utilisée
      await tx.brokerInvitation.update({
        where: { id: invitation.id },
        data: { used: true },
      });

      // Marquer l'email comme vérifié
      await tx.user.update({
        where: { id: signUpResult.user.id },
        data: { emailVerified: true },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Compte créé avec succès",
      user: {
        id: signUpResult.user.id,
        name: signUpResult.user.name,
        email: signUpResult.user.email,
        role: "BROKER",
      },
    });
  } catch (error) {
    console.error("Error completing broker setup:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la création du compte",
      },
      { status: 500 }
    );
  }
}
