import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import LetterOfIntentPDF from "@/components/pdf/LetterOfIntentPDF";
import PremiumCallPDF from "@/components/pdf/PremiumCallPDF";
import ContratPDF from "@/components/pdf/ContratPDF";

import { ApiError, withAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import OfferLetterPDF from "@/components/pdf/OfferLetterPDF";

const PDF_LOG_PREFIX = "[generate-pdf]";
const DEBUG_PDF = false;

/** Données non sensibles pour suivre quel devis plante sans tout logger */
function summarizePayload(
  type: string,
  quote: Record<string, unknown>,
  calculationResult?: unknown,
) {
  const fd = quote?.formData as Record<string, unknown> | undefined;
  const activities = fd?.activities;
  const cr =
    calculationResult && typeof calculationResult === "object"
      ? (calculationResult as Record<string, unknown>)
      : null;
  return {
    type,
    quoteRef: quote?.reference,
    quoteId: quote?.id,
    hasFormData: Boolean(fd),
    activityCount: Array.isArray(activities) ? activities.length : null,
    hasCalculationResult: Boolean(calculationResult),
    ...(DEBUG_PDF && cr
      ? { calculationResultKeys: Object.keys(cr).slice(0, 32) }
      : {}),
    ...(DEBUG_PDF ? { quoteKeys: Object.keys(quote).slice(0, 32) } : {}),
  };
}

function logPdfError(stage: string, error: unknown) {
  console.error(`${PDF_LOG_PREFIX} FAIL stage=${stage}`);
  if (error instanceof Error) {
    console.error(`${PDF_LOG_PREFIX}`, error.message);
    console.error(`${PDF_LOG_PREFIX}`, error.stack);
    let cause = error.cause as unknown;
    let depth = 0;
    while (cause instanceof Error && depth++ < 5) {
      console.error(`${PDF_LOG_PREFIX} cause[${depth}]:`, cause.message);
      cause = cause.cause as unknown;
    }
  } else {
    console.error(`${PDF_LOG_PREFIX}`, String(error));
    try {
      console.error(`${PDF_LOG_PREFIX}`, JSON.stringify(error));
    } catch {
      /* ignore */
    }
  }
}

export async function POST(request: NextRequest) {
  return withAuth(async (userId, userRole) => {
    try {
      const {
        type,
        quote,
        calculationResult,
        formData,
        selectedDocuments,
        markdownContent,
      } = await request.json();

      console.log(
        `${PDF_LOG_PREFIX}`,
        summarizePayload(
          type || "",
          (quote || {}) as Record<string, unknown>,
          calculationResult,
        ),
      );

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
          { status: 400 },
        );
      }

      let pdfDocument: any;
      let filename: string;
      const baseUrl = request.headers.get("origin") || request.nextUrl.origin;

      const resolveOfferLetterBrokerName = async (q: typeof quote) => {
        const fromQuote =
          typeof q?.broker?.name === "string" ? q.broker.name.trim() : "";
        if (fromQuote) return fromQuote;
        const brokerId = q?.brokerId as string | undefined;
        if (brokerId) {
          const brokerUser = await prisma.user.findUnique({
            where: { id: brokerId },
            select: { name: true },
          });
          const n = brokerUser?.name?.trim();
          if (n) return n;
        }
        return "";
      };

      switch (type) {
        case "letter-of-intent":
          pdfDocument = React.createElement(LetterOfIntentPDF, {
            quote,
            calculationResult,
            user: { ...user, brokerCode: brokerProfile.code },
            baseUrl,
          });
          filename = `lettre-intention-${quote.reference || "devis"}.pdf`;
          break;
        case "premium-call":
          pdfDocument = React.createElement(PremiumCallPDF, {
            quote,
            calculationResult,
            baseUrl,
          });
          filename = `appel-prime-${quote.reference || "devis"}.pdf`;
          break;
        case "offer-letter": {
          const brokerName = await resolveOfferLetterBrokerName(quote);
          pdfDocument = React.createElement(OfferLetterPDF, {
            quote,
            calculationResult,
            formData,
            brokerName,
            selectedDocuments,
            baseUrl,
          });
          filename = `proposition-offre-${quote.reference || "devis"}.pdf`;
          break;
        }
        case "contrat":
          pdfDocument = React.createElement(ContratPDF, {
            baseUrl,
            quote,
            formData: quote?.formData || formData,
            calculationResult,
          });
          filename = `contrat-${quote.reference || "devis"}.pdf`;
          break;

        default:
          return NextResponse.json(
            { success: false, error: "Type de document non supporté" },
            { status: 400 },
          );
      }

      console.log(`${PDF_LOG_PREFIX}`, {
        phase: "react-tree-ready",
        filename,
        baseUrlOrigin: baseUrl.replace(/\/?$/, ""),
        ...(DEBUG_PDF ? { selectedDocuments } : {}),
      });

      const started = Date.now();

      try {
        const pdfInstance = pdf(pdfDocument as Parameters<typeof pdf>[0]);
        const pdfStream = await pdfInstance.toBlob();
        const pdfBuffer = Buffer.from(await pdfStream.arrayBuffer());

        console.log(`${PDF_LOG_PREFIX}`, {
          phase: "generated",
          ms: Date.now() - started,
          bytes: pdfBuffer.length,
          type,
          filename,
        });

        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": pdfBuffer.length.toString(),
          },
        });
      } catch (renderErr) {
        logPdfError(`pdf().toBlob type=${type}`, renderErr);
        throw renderErr;
      }
    } catch (error) {
      logPdfError("route", error);
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la génération du PDF";
      return NextResponse.json(
        {
          success: false,
          error: DEBUG_PDF
            ? `PDF: ${message}`
            : "Erreur lors de la génération du PDF",
          ...(DEBUG_PDF && error instanceof Error
            ? { detail: message, name: error.name }
            : {}),
        },
        { status: 500 },
      );
    }
  });
}
