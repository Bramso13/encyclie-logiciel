import { NextRequest, NextResponse } from "next/server";
import { sendEmailWithAttachment } from "@/lib/nodemailer";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const quoteId = formData.get("quoteId") as string;
    const directorName = formData.get("directorName") as string;
    const companyName = formData.get("companyName") as string;
    const brokerEmail = formData.get("brokerEmail") as string;
    const pdfFile = formData.get("pdf") as File;

    if (!quoteId || !brokerEmail || !pdfFile) {
      return NextResponse.json(
        { error: "Données manquantes pour l'envoi de l'email" },
        { status: 400 }
      );
    }

    // Convertir le fichier PDF en buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    // Contenu de l'email simple
    const emailContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">Proposition d'Assurance RCD</h2>
        
        <p>Bonjour,</p>
        
        <p>Vous trouverez ci-joint la proposition d'assurance Responsabilité Civile Décennale pour :</p>
        
        <ul>
          <li><strong>Entreprise :</strong> ${companyName || "N/A"}</li>
          <li><strong>Dirigeant :</strong> ${directorName || "N/A"}</li>
          <li><strong>Référence du devis :</strong> ${quoteId}</li>
        </ul>
        
        <p>Cette proposition est valable 30 jours à compter de sa date d'émission.</p>
        
        <p>Pour toute question concernant cette proposition, n'hésitez pas à nous contacter.</p>
        
        <p>Cordialement,<br>
        L'équipe ENCYCLIE CONSTRUCTION</p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          ENCYCLIE CONSTRUCTION - 42 Rue Notre-Dame des Victoires, 75002 PARIS<br>
          SAS au capital de 1 000 € - SIREN 897 796 785 - RCS ST NAZAIRE<br>
          N° ORIAS : 21 004 564 - www.orias.fr
        </p>
      </div>
    `;

    // Envoyer l'email avec la pièce jointe PDF
    await sendEmailWithAttachment(
      brokerEmail,
      `Proposition d'assurance RCD - Devis ${quoteId}`,
      emailContent,
      emailContent,
      [
        {
          filename: `proposition-offre-${quoteId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    );

    return NextResponse.json(
      { success: true, message: "Email envoyé avec succès" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    );
  }
}
