import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      // Appel de la route API pour éviter l'import de nodemailer dans le middleware (edge runtime)
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      try {
        const response = await fetch(`${baseUrl}/api/auth/send-password-reset-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            url,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Erreur lors de l'envoi de l'email de réinitialisation:", error);
          throw new Error(error.error || "Erreur lors de l'envoi de l'email");
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi de l'email de réinitialisation:", error);
        throw error;
      }
    },
    resetPasswordTokenExpiresIn: 3600, // 1 heure
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    modelName: "User",
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "BROKER",
      },
      companyName: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      address: {
        type: "string",
        required: false,
      },
      siretNumber: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },
});
type Session = typeof auth.$Infer.Session;
