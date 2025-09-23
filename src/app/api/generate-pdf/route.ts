import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import LetterOfIntentPDF from "@/components/pdf/LetterOfIntentPDF";
import PremiumCallPDF from "@/components/pdf/PremiumCallPDF";

export async function POST(request: NextRequest) {
  try {
    const { type, quote, calculationResult } = await request.json();

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
