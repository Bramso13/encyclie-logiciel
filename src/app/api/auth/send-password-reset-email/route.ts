import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getPasswordResetTemplate } from "@/lib/nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, url, userId } = body;

    if (!email || !url || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Données manquantes pour l'envoi de l'email",
        },
        { status: 400 }
      );
    }

    const emailTemplate = getPasswordResetTemplate(email, url);

    await sendEmail(
      email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      {
        type: "PASSWORD_RESET" as any,
        relatedUserId: userId,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Email de réinitialisation envoyé avec succès",
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'envoi de l'email de réinitialisation",
      },
      { status: 500 }
    );
  }
}
