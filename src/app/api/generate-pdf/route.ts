import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import LetterOfIntentPDF from "@/components/pdf/LetterOfIntentPDF";
import PremiumCallPDF from "@/components/pdf/PremiumCallPDF";

import { ApiError, withAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import OfferLetterPDF from "@/components/pdf/OfferLetterPDF";

export async function POST(request: NextRequest) {
  return withAuth(async (userId, userRole) => {
    try {
      const { type, quote, calculationResult, formData } = await request.json();

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const brokerProfile = await prisma.brokerProfile.findUnique({
        where: { userId: userId },
      });

      if (!brokerProfile) {
        throw new ApiError(401, "Non autorisé - profile broker non trouvé");
      }

      if (!type || !quote) {
        return NextResponse.json(
          { success: false, error: "Type et quote requis" },
          { status: 400 }
        );
      }

      let pdfDocument: any;
      let filename: string;

      switch (type) {
        case "letter-of-intent":
          pdfDocument = React.createElement(LetterOfIntentPDF, {
            quote,
            calculationResult,
            user: { ...user, brokerCode: brokerProfile.code },
          });
          filename = `lettre-intention-${quote.reference || "devis"}.pdf`;
          break;
        case "premium-call":
          pdfDocument = React.createElement(PremiumCallPDF, {
            quote,
            calculationResult,
          });
          filename = `appel-prime-${quote.reference || "devis"}.pdf`;
          break;
        case "offer-letter":
          pdfDocument = React.createElement(OfferLetterPDF, {
            quote,
            calculationResult,
            formData,
            brokerCode: brokerProfile.code,
          });
          filename = `proposition-offre-${quote.reference || "devis"}.pdf`;
          break;
        default:
          return NextResponse.json(
            { success: false, error: "Type de document non supporté" },
            { status: 400 }
          );
      }

      // Générer le PDF
      const pdfStream = await pdf(pdfDocument).toBlob();
      const pdfBuffer = Buffer.from(await pdfStream.arrayBuffer());

      // Retourner le PDF
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      return NextResponse.json(
        { success: false, error: "Erreur lors de la génération du PDF" },
        { status: 500 }
      );
    }
  });
}
