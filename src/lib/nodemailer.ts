import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

// Types pour les logs d'email
type EmailType =
  | "OFFER_LETTER"
  | "BROKER_INVITATION"
  | "PAYMENT_REMINDER"
  | "DOCUMENT_REQUEST"
  | "GENERAL";

interface LogEmailParams {
  to: string;
  cc?: string;
  subject: string;
  type: EmailType;
  htmlContent?: string;
  textContent?: string;
  hasAttachments?: boolean;
  attachmentNames?: string;
  relatedQuoteId?: string;
  relatedUserId?: string;
  sentById?: string;
}

// Fonction pour logger un email dans la base de données
async function logEmail(
  params: LogEmailParams,
  messageId?: string,
  error?: any
) {
  try {
    await prisma.emailLog.create({
      data: {
        to: params.to,
        cc: params.cc || null,
        subject: params.subject,
        type: params.type,
        status: error ? "FAILED" : "SENT",
        htmlContent: params.htmlContent || null,
        textContent: params.textContent || null,
        hasAttachments: params.hasAttachments || false,
        attachmentNames: params.attachmentNames || null,
        relatedQuoteId: params.relatedQuoteId || null,
        relatedUserId: params.relatedUserId || null,
        messageId: messageId || null,
        errorMessage: error ? String(error) : null,
        sentById: params.sentById || null,
        sentAt: error ? null : new Date(),
      },
    });
  } catch (logError) {
    console.error("Erreur lors du logging de l'email:", logError);
    // Ne pas interrompre le processus d'envoi d'email si le logging échoue
  }
}

// Configuration du transporteur email
export const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Fonction d'envoi d'email avec pièce jointe
export const sendEmailWithAttachment = async (
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>,
  options?: {
    type?: EmailType;
    relatedQuoteId?: string;
    relatedUserId?: string;
    sentById?: string;
    cc?: string;
  }
) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Encyclie Construction" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to,
      cc: options?.cc,
      subject,
      html,
      text,
      attachments,
    });

    console.log("Email with attachment sent:", info.messageId);

    // Logger l'email envoyé
    await logEmail(
      {
        to,
        cc: options?.cc,
        subject,
        type: options?.type || "GENERAL",
        htmlContent: html,
        textContent: text,
        hasAttachments: true,
        attachmentNames: attachments.map((a) => a.filename).join(", "),
        relatedQuoteId: options?.relatedQuoteId,
        relatedUserId: options?.relatedUserId,
        sentById: options?.sentById,
      },
      info.messageId
    );

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email with attachment sending failed:", error);

    // Logger l'échec d'envoi
    await logEmail(
      {
        to,
        cc: options?.cc,
        subject,
        type: options?.type || "GENERAL",
        htmlContent: html,
        textContent: text,
        hasAttachments: true,
        attachmentNames: attachments.map((a) => a.filename).join(", "),
        relatedQuoteId: options?.relatedQuoteId,
        relatedUserId: options?.relatedUserId,
        sentById: options?.sentById,
      },
      undefined,
      error
    );

    throw error;
  }
};

// Template d'email d'invitation pour courtier
export const getBrokerInvitationTemplate = (
  name: string,
  brokerCode: string,
  invitationToken: string
) => {
  const setupUrl = `${process.env.NEXTAUTH_URL}/auth/setup-account?token=${invitationToken}`;
  console.log("setupUrl", setupUrl);

  return {
    subject: "Invitation - Plateforme Encyclie Construction",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Encyclie Construction</title>
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
            .button {
              display: inline-block;
              background: #4f46e5;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .code {
              background: #e5e7eb;
              padding: 8px 12px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 16px;
              font-weight: bold;
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
            <p>Bienvenue dans notre plateforme</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${name},</h2>
            
            <p>Vous avez été invité(e) à rejoindre la plateforme <strong>Encyclie Construction</strong> en tant que courtier.</p>
            
            <div class="card">
              <h3>🆔 Vos informations de courtier</h3>
              <p><strong>Code courtier :</strong> <span class="code">${brokerCode}</span></p>
              <p>Ce code vous identifie de manière unique dans notre système.</p>
            </div>
            
            <div class="card">
              <h3>🔐 Configuration de votre compte</h3>
              <p>Pour créer votre compte et accéder à la plateforme, cliquez sur le bouton ci-dessous :</p>
              
              <a href="${setupUrl}" class="button">Créer mon compte</a>
              
              <p><small>Ce lien est valable pendant 7 jours.</small></p>
            </div>
            
            <div class="card">
              <h3>📋 Prochaines étapes</h3>
              <ol>
                <li>Cliquez sur le bouton ci-dessus pour créer votre compte</li>
                <li>Choisissez un mot de passe sécurisé</li>
                <li>Connectez-vous à la plateforme avec vos identifiants</li>
                <li>Explorez les fonctionnalités disponibles</li>
                <li>Commencez à créer des devis pour vos clients</li>
              </ol>
            </div>
            
            <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe support.</p>
            
            <p>Cordialement,<br>L'équipe Encyclie Construction</p>
          </div>
          
          <div class="footer">
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <p><a href="${setupUrl}">${setupUrl}</a></p>
            <p>© ${new Date().getFullYear()} Encyclie Construction. Tous droits réservés.</p>
          </div>
        </body>
      </html>
    `,
    text: `
Bonjour ${name},

Vous avez été invité(e) à rejoindre la plateforme Encyclie Construction en tant que courtier.

Votre code courtier : ${brokerCode}

Pour créer votre compte, visitez ce lien :
${setupUrl}

Ce lien est valable pendant 7 jours.

Prochaines étapes :
1. Créer votre compte
2. Choisir un mot de passe sécurisé
3. Se connecter à la plateforme
4. Explorer les fonctionnalités
5. Commencer à créer des devis

Cordialement,
L'équipe Encyclie Construction
    `,
  };
};

// Fonction d'envoi d'email
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text: string,
  options?: {
    type?: EmailType;
    relatedQuoteId?: string;
    relatedUserId?: string;
    sentById?: string;
    cc?: string;
  }
) => {
  const transporter = createEmailTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"Encyclie Construction" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to,
      cc: options?.cc,
      subject,
      html,
      text,
    });

    console.log("Email sent:", info.messageId);

    // Logger l'email envoyé
    await logEmail(
      {
        to,
        cc: options?.cc,
        subject,
        type: options?.type || "GENERAL",
        htmlContent: html,
        textContent: text,
        hasAttachments: false,
        relatedQuoteId: options?.relatedQuoteId,
        relatedUserId: options?.relatedUserId,
        sentById: options?.sentById,
      },
      info.messageId
    );

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);

    // Logger l'échec d'envoi
    await logEmail(
      {
        to,
        cc: options?.cc,
        subject,
        type: options?.type || "GENERAL",
        htmlContent: html,
        textContent: text,
        hasAttachments: false,
        relatedQuoteId: options?.relatedQuoteId,
        relatedUserId: options?.relatedUserId,
        sentById: options?.sentById,
      },
      undefined,
      error
    );

    throw error;
  }
};
