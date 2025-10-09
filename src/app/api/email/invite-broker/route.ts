import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getBrokerInvitationTemplate } from "@/lib/nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, invitationToken, brokerCode } = body;

    if (!email || !name || !invitationToken || !brokerCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Données manquantes pour l'envoi de l'email",
        },
        { status: 400 }
      );
    }

    // Générer le contenu de l'email
    const emailTemplate = getBrokerInvitationTemplate(
      name,
      brokerCode,
      invitationToken
    );

    console.log(
      `${process.env.NEXTAUTH_URL}/auth/setup-account?token=${invitationToken}`
    );

    // Envoyer l'email
    await sendEmail(
      email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      {
        type: "BROKER_INVITATION",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Email d'invitation envoyé avec succès",
    });
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'envoi de l'email d'invitation",
      },
      { status: 500 }
    );
  }
}
