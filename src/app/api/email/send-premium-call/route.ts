import { NextRequest, NextResponse } from "next/server";
import { sendEmailWithAttachment } from "@/lib/nodemailer";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const quoteId = formData.get("quoteId") as string;
    const companyName = formData.get("companyName") as string;
    const clientEmail = formData.get("clientEmail") as string;
    const pdfFile = formData.get("pdf") as File;

    if (!quoteId || !companyName || !clientEmail || !pdfFile) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    const subject = `Appel de prime - ${companyName}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827;">
          <h2 style="margin:0 0 12px 0;">Appel de prime</h2>
          <p>Veuillez trouver en pièce jointe l'appel de prime pour <strong>${companyName}</strong>, incluant l'échéancier de règlement.</p>
          <p style="color:#6b7280">Cet email a été envoyé automatiquement depuis la plateforme.</p>
        </body>
      </html>
    `;
    const text = `Appel de prime pour ${companyName} en pièce jointe.`;

    await sendEmailWithAttachment(
      clientEmail,
      subject,
      html,
      text,
      [
        {
          filename: `appel-prime-${companyName.replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur envoi email appel de prime:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    );
  }
}


