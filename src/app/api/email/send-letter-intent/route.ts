import { NextRequest, NextResponse } from "next/server";
import { sendEmail, sendEmailWithAttachment } from "@/lib/nodemailer";
import { CABINET } from "@/lib/cabinet";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const quoteId = formData.get("quoteId") as string;
    const brokerName = formData.get("brokerName") as string;
    const companyName = formData.get("companyName") as string;
    const clientEmail = formData.get("clientEmail") as string;
    const pdfFile = formData.get("pdf") as File;

    console.log("quoteId", quoteId);
    console.log("brokerName", brokerName);
    console.log("companyName", companyName);
    console.log("clientEmail", clientEmail);
    console.log("pdfFile", pdfFile);

    if (!quoteId || !brokerName || !companyName || !clientEmail || !pdfFile) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    // Convertir le PDF en buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    // Template d'email pour la lettre d'intention
    const emailTemplate = getLetterIntentTemplate(brokerName, companyName);

    // Envoyer l'email avec le PDF en pièce jointe
    await sendEmailWithAttachment(
      clientEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      [
        {
          filename: `lettre-intention-${companyName.replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur envoi email lettre d'intention:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    );
  }
}

// Template d'email pour la lettre d'intention
const getLetterIntentTemplate = (brokerName: string, companyName: string) => {
  return {
    subject: `Lettre d'intention - Assurance RC Décennale - ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Lettre d'intention - Encyclie Construction</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .card {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .highlight {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏢 Encyclie Construction</h1>
            <p>Lettre d'intention - Assurance RC Décennale</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${brokerName},</h2>
            
            <p>Nous vous remercions pour votre demande d'assurance Responsabilité Civile Décennale pour <strong>${companyName}</strong>.</p>
            
            <div class="card">
              <h3>📋 Votre lettre d'intention</h3>
              <p>Veuillez trouver ci-joint votre lettre d'intention personnalisée avec notre proposition tarifaire indicative.</p>
              
              <div class="highlight">
                <p><strong>⚠️ Important :</strong> Cette proposition est valable 30 jours à compter de la date d'émission.</p>
              </div>
            </div>
            
            <div class="card">
              <h3>📄 Contenu de la lettre</h3>
              <ul>
                <li>Informations de votre entreprise</li>
                <li>Analyse de votre expérience professionnelle</li>
                <li>Proposition tarifaire détaillée</li>
                <li>Modalités de paiement</li>
                <li>Conditions générales</li>
              </ul>
            </div>
            
            <div class="card">
              <h3>✅ Prochaines étapes</h3>
              <ol>
                <li>Consultez attentivement la lettre d'intention</li>
                <li>Vérifiez les informations de votre entreprise</li>
                <li>Contactez-nous pour toute question</li>
                <li>Retournez le document signé si vous acceptez notre proposition</li>
              </ol>
            </div>
            
            <p>Si vous avez des questions concernant cette proposition ou souhaitez des précisions, n'hésitez pas à nous contacter.</p>
            
            <p>Cordialement,<br><strong>L'équipe commerciale</strong><br>Encyclie Construction</p>
          </div>
          
          <div class="footer">
            <p>📧 Email : ${CABINET.email}</p>
            <p>Téléphone : ${CABINET.phone}</p>
            <p>📍 ${CABINET.addressLine}, ${CABINET.postalCityCaps}</p>
            <p>© ${new Date().getFullYear()} Encyclie Construction. Tous droits réservés.</p>
          </div>
        </body>
      </html>
    `,
    text: `
Bonjour ${brokerName},

Nous vous remercions pour votre demande d'assurance Responsabilité Civile Décennale pour ${companyName}.

Veuillez trouver ci-joint votre lettre d'intention personnalisée avec notre proposition tarifaire indicative.

IMPORTANT : Cette proposition est valable 30 jours à compter de la date d'émission.

Contenu de la lettre :
- Informations de votre entreprise
- Analyse de votre expérience professionnelle  
- Proposition tarifaire détaillée
- Modalités de paiement
- Conditions générales

Prochaines étapes :
1. Consultez attentivement la lettre d'intention
2. Vérifiez les informations de votre entreprise
3. Contactez-nous pour toute question
4. Retournez le document signé si vous acceptez notre proposition

Si vous avez des questions concernant cette proposition ou souhaitez des précisions, n'hésitez pas à nous contacter.

Cordialement,
L'équipe commerciale
Encyclie Construction

Email : ${CABINET.email}
Téléphone : ${CABINET.phone}
${CABINET.addressLine}, ${CABINET.postalCityCaps}
    `,
  };
};
