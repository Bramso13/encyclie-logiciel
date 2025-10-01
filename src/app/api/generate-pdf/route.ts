import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import LetterOfIntentPDF from "@/components/pdf/LetterOfIntentPDF";
import PremiumCallPDF from "@/components/pdf/PremiumCallPDF";
import { ApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { type, quote, calculationResult } = await request.json();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new ApiError(401, "Non autorisé - session invalide");
    }

    const brokerProfile = await prisma.brokerProfile.findUnique({
      where: { userId: session.user.id },
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
          user: { ...session.user, brokerCode: brokerProfile.code },
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
}
