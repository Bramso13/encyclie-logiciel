import { NextRequest, NextResponse } from "next/server";
import { sendEmailWithAttachment } from "@/lib/nodemailer";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const quoteId = formData.get("quoteId") as string;
    const companyName = formData.get("companyName") as string;
    const clientEmail = formData.get("clientEmail") as string;
    const pdfFile = formData.get("pdf") as File;
    const contractNumber =
      (formData.get("contractNumber") as string) || "xxxRCDWAK";

    if (!quoteId || !companyName || !clientEmail || !pdfFile) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    // Convertir le PDF en buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    // Template d'email pour l'attestation
    const emailTemplate = getAttestationTemplate(companyName, contractNumber);

    // Envoyer l'email avec le PDF en pièce jointe
    await sendEmailWithAttachment(
      clientEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      [
        {
          filename: `attestation-rcd-${companyName.replace(
            /\s+/g,
            "-"
          )}-${contractNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
      {
        type: "ATTESTATION" as const,
        relatedQuoteId: quoteId,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur envoi email attestation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    );
  }
}

// Template d'email pour l'attestation
const getAttestationTemplate = (
  companyName: string,
  contractNumber: string
) => {
  const subject = `Attestation d'assurance RCD - ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4A90E2;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 30px;
          border: 1px solid #ddd;
          border-top: none;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 15px;
          font-size: 12px;
          color: #666;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 5px 5px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4A90E2;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 20px;
        }
        h2 {
          color: #2c3e50;
          margin-top: 0;
        }
        .info-box {
          background-color: #fff;
          border-left: 4px solid #4A90E2;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0; color: white;">ENCYCLIE CONSTRUCTION</h1>
      </div>
      <div class="content">
        <h2>Attestation d'assurance RCD</h2>
        
        <p>Bonjour,</p>
        
        <p>Vous trouverez ci-joint votre attestation d'assurance Responsabilité Civile Décennale pour :</p>
        
        <div class="info-box">
          <p style="margin: 5px 0;"><strong>Entreprise :</strong> ${companyName}</p>
          <p style="margin: 5px 0;"><strong>Numéro de contrat :</strong> ${contractNumber}</p>
        </div>
        
        <p>Cette attestation certifie que vous êtes couvert par un contrat d'assurance RCD en cours de validité.</p>
        
        <p>Veuillez conserver cette attestation en lieu sûr et la présenter si nécessaire lors de vos démarches administratives ou contractuelles.</p>
        
        <p>Pour toute question concernant cette attestation ou votre contrat d'assurance, n'hésitez pas à nous contacter.</p>
        
        <p>Cordialement,<br>
        <strong>L'équipe ENCYCLIE CONSTRUCTION</strong></p>
      </div>
      <div class="footer">
        <p style="margin: 5px 0;"><strong>ENCYCLIE CONSTRUCTION</strong></p>
        <p style="margin: 5px 0;">42 Rue Notre-Dame des Victoires, 75002 PARIS</p>
        <p style="margin: 5px 0;">SAS au capital de 1 000 € - SIREN 897 796 785 - RCS ST NAZAIRE</p>
        <p style="margin: 5px 0;">N° ORIAS : 21 004 564 - www.orias.fr</p>
        <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
          Ce message est envoyé automatiquement, merci de ne pas y répondre directement.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    ENCYCLIE CONSTRUCTION
    Attestation d'assurance RCD
    
    Bonjour,
    
    Vous trouverez ci-joint votre attestation d'assurance Responsabilité Civile Décennale pour :
    
    Entreprise : ${companyName}
    Numéro de contrat : ${contractNumber}
    
    Cette attestation certifie que vous êtes couvert par un contrat d'assurance RCD en cours de validité.
    
    Veuillez conserver cette attestation en lieu sûr et la présenter si nécessaire lors de vos démarches administratives ou contractuelles.
    
    Pour toute question concernant cette attestation ou votre contrat d'assurance, n'hésitez pas à nous contacter.
    
    Cordialement,
    L'équipe ENCYCLIE CONSTRUCTION
    
    ENCYCLIE CONSTRUCTION
    42 Rue Notre-Dame des Victoires, 75002 PARIS
    SAS au capital de 1 000 € - SIREN 897 796 785 - RCS ST NAZAIRE
    N° ORIAS : 21 004 564 - www.orias.fr
  `;

  return { subject, html, text };
};
