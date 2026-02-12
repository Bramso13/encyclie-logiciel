import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateQuoteSchema } from "@/lib/validations";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  withAuthAndRole,
  ApiError,
} from "@/lib/api-utils";

// GET /api/quotes/[id] - Get single quote
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          product: {
            select: {
              name: true,
              code: true,
              formFields: true,
              requiredDocs: true,
              stepConfig: true,
            },
          },
          broker: {
            select: { id: true, name: true, companyName: true, email: true },
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              documentType: true,
              fileSize: true,
              uploadedAt: true,
              isVerified: true,
              validationNotes: true,
              validatedAt: true,
              validatedById: true,
            },
          },
          contract: {
            select: {
              id: true,
              reference: true,
              status: true,
            },
          },
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }
      console.log("quote", quote);
      // Role-based access control
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      return createApiResponse(quote);
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/quotes/[id] - Update quote
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const body = await request.json();
      const validatedData = UpdateQuoteSchema.parse(body);

      // Get existing quote with full data for versioning
      const existingQuote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          reference: true,
          brokerId: true,
          status: true,
          companyData: true,
          formData: true,
          calculatedPremium: true,
          offerData: true,
          validUntil: true,
          submittedAt: true,
          offerReadyAt: true,
          offerSentAt: true,
          acceptedAt: true,
        },
      });

      if (!existingQuote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Role-based access control
      if (userRole === "BROKER" && existingQuote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // // Status change validation
      // if (validatedData.status) {
      //   const allowedTransitions = getStatusTransitions(
      //     existingQuote.status,
      //     userRole
      //   );
      //   if (!allowedTransitions.includes(validatedData.status)) {
      //     throw new ApiError(
      //       400,
      //       `Transition de statut non autorisée: ${existingQuote.status} -> ${validatedData.status}`
      //     );
      //   }
      // }

      // Prepare update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Reference: vérifier unicité si modification
      if (validatedData.reference !== undefined) {
        if (validatedData.reference !== existingQuote.reference) {
          const existing = await prisma.quote.findUnique({
            where: { reference: validatedData.reference },
            select: { id: true },
          });
          if (existing) {
            throw new ApiError(400, "Cette référence existe déjà");
          }
        }
        updateData.reference = validatedData.reference;
      }

      // Add validated fields to update data
      if (validatedData.status !== undefined) {
        updateData.status = validatedData.status;
      }
      if (validatedData.formData !== undefined) {
        updateData.formData = validatedData.formData;
      }
      if (validatedData.companyData !== undefined) {
        updateData.companyData = validatedData.companyData;
      }
      if (validatedData.calculatedPremium !== undefined) {
        // Store as JSON (Prisma will handle conversion)
        updateData.calculatedPremium = validatedData.calculatedPremium;
      }
      if (validatedData.validUntil !== undefined) {
        // Convert string to Date if provided
        updateData.validUntil = validatedData.validUntil
          ? new Date(validatedData.validUntil)
          : null;
      }

      // Add workflow timestamps based on status
      if (validatedData.status) {
        switch (validatedData.status) {
          case "SUBMITTED":
            updateData.submittedAt = new Date();
            break;
          case "OFFER_READY":
            updateData.offerReadyAt = new Date();
            break;
          case "OFFER_SENT":
            updateData.offerSentAt = new Date();
            break;
          case "ACCEPTED":
            updateData.acceptedAt = new Date();
            break;
        }
      }

      // Calculate changes and determine action type
      const changes: Record<string, { old: any; new: any }> = {};
      let hasChanges = false;

      if (
        validatedData.reference !== undefined &&
        validatedData.reference !== existingQuote.reference
      ) {
        changes.reference = {
          old: existingQuote.reference,
          new: validatedData.reference,
        };
        hasChanges = true;
      }

      if (
        validatedData.status &&
        validatedData.status !== existingQuote.status
      ) {
        changes.status = {
          old: existingQuote.status,
          new: validatedData.status,
        };
        hasChanges = true;
      }

      if (validatedData.formData) {
        const formDataChanged =
          JSON.stringify(validatedData.formData) !==
          JSON.stringify(existingQuote.formData);
        if (formDataChanged) {
          changes.formData = {
            old: existingQuote.formData,
            new: validatedData.formData,
          };
          hasChanges = true;
        }
      }

      if (validatedData.companyData) {
        const companyDataChanged =
          JSON.stringify(validatedData.companyData) !==
          JSON.stringify(existingQuote.companyData);
        if (companyDataChanged) {
          changes.companyData = {
            old: existingQuote.companyData,
            new: validatedData.companyData,
          };
          hasChanges = true;
        }
      }

      if (validatedData.calculatedPremium !== undefined) {
        // Compare calculatedPremium - it can be a number or a JSON object
        // If existing is JSON and new is number, convert for comparison
        // If both are JSON, compare the JSON strings
        const existingPremiumJson = JSON.stringify(
          existingQuote.calculatedPremium || null
        );
        const newPremiumJson = JSON.stringify(validatedData.calculatedPremium);

        if (existingPremiumJson !== newPremiumJson) {
          changes.calculatedPremium = {
            old: existingQuote.calculatedPremium,
            new: validatedData.calculatedPremium,
          };
          hasChanges = true;
        }
      }

      if (validatedData.validUntil !== undefined) {
        const validUntilDate = validatedData.validUntil
          ? new Date(validatedData.validUntil)
          : null;
        const existingValidUntil = existingQuote.validUntil
          ? existingQuote.validUntil.toISOString()
          : null;
        const newValidUntil = validUntilDate
          ? validUntilDate.toISOString()
          : null;

        if (existingValidUntil !== newValidUntil) {
          changes.validUntil = {
            old: existingQuote.validUntil,
            new: validUntilDate,
          };
          hasChanges = true;
        }
      }

      // If no changes detected, return early
      if (!hasChanges) {
        const quote = await prisma.quote.findUnique({
          where: { id: params.id },
          include: {
            product: {
              select: { name: true, code: true },
            },
            broker: {
              select: { name: true, companyName: true },
            },
          },
        });
        return createApiResponse(quote, "Aucune modification détectée");
      }

      // Determine action type (priority order: STATUS_CHANGE > PREMIUM_UPDATE > DATA_UPDATE > role-based)
      let action:
        | "STATUS_CHANGE"
        | "DATA_UPDATE"
        | "PREMIUM_UPDATE"
        | "OFFER_UPDATE"
        | "ADMIN_CORRECTION"
        | "BROKER_MODIFICATION";

      if (changes.status) {
        action = "STATUS_CHANGE";
      } else if (changes.calculatedPremium) {
        action = "PREMIUM_UPDATE";
      } else if (
        changes.formData ||
        changes.companyData ||
        changes.validUntil
      ) {
        // Data changes (formData, companyData, validUntil)
        action = "DATA_UPDATE";
      } else {
        // Other changes or corrections
        action =
          userRole === "ADMIN" ? "ADMIN_CORRECTION" : "BROKER_MODIFICATION";
      }

      // Get the next version number
      const lastVersion = await prisma.quoteVersion.findFirst({
        where: { quoteId: params.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const nextVersion = (lastVersion?.version || 0) + 1;

      // Get IP and User Agent from request
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";

      // Get change reason from body if provided
      const changeReason = (body as any).changeReason || null;

      // Update quote and create version in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create version snapshot BEFORE updating
        const quoteVersion = await tx.quoteVersion.create({
          data: {
            quoteId: params.id,
            version: nextVersion,
            status: existingQuote.status, // Old status
            companyData: existingQuote.companyData as any,
            formData: existingQuote.formData as any,
            calculatedPremium: existingQuote.calculatedPremium as any,
            offerData: existingQuote.offerData as any,
            validUntil: existingQuote.validUntil,
            submittedAt: existingQuote.submittedAt,
            offerReadyAt: existingQuote.offerReadyAt,
            offerSentAt: existingQuote.offerSentAt,
            acceptedAt: existingQuote.acceptedAt,
            changedById: userId,
            changeReason:
              changeReason || getDefaultChangeReason(action, userRole),
            action: action,
            changes: changes as any,
            userRole: userRole,
            ipAddress: ipAddress,
            userAgent: userAgent,
          },
        });

        // Update quote
        const updatedQuote = await tx.quote.update({
          where: { id: params.id },
          data: updateData,
          include: {
            product: {
              select: { name: true, code: true },
            },
            broker: {
              select: { name: true, companyName: true },
            },
          },
        });

        return { updatedQuote, quoteVersion };
      });

      return createApiResponse(
        {
          quote: result.updatedQuote,
          version: result.quoteVersion.version,
        },
        `Devis mis à jour avec succès (version ${result.quoteVersion.version} créée)`
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/quotes/[id] - Delete quote (Admin/Broker only)
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
          status: true,
          contract: { select: { id: true } },
          product: { select: { name: true, code: true } },
          formData: true,
          companyData: true,
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Role-based access control
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // Cannot delete if contract exists
      if (quote.contract) {
        throw new ApiError(
          400,
          "Impossible de supprimer un devis avec un contrat associé"
        );
      }

      // Cannot delete if not in draft status (except for admins)
      if (quote.status !== "DRAFT" && userRole !== "ADMIN") {
        throw new ApiError(
          400,
          "Seuls les devis en brouillon peuvent être supprimés"
        );
      }

      // Delete quote (documents will be cascaded)
      await prisma.quote.delete({
        where: { id: params.id },
      });

      return createApiResponse(null, "Devis supprimé avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Helper function to get default change reason based on action and user role
function getDefaultChangeReason(
  action:
    | "STATUS_CHANGE"
    | "DATA_UPDATE"
    | "PREMIUM_UPDATE"
    | "OFFER_UPDATE"
    | "ADMIN_CORRECTION"
    | "BROKER_MODIFICATION",
  userRole: string
): string {
  const actionLabels: Record<string, string> = {
    STATUS_CHANGE: "Changement de statut",
    DATA_UPDATE: "Mise à jour des données",
    PREMIUM_UPDATE: "Mise à jour de la prime",
    OFFER_UPDATE: "Mise à jour de l'offre",
    ADMIN_CORRECTION: "Correction administrative",
    BROKER_MODIFICATION: "Modification par le courtier",
  };

  const roleLabels: Record<string, string> = {
    ADMIN: "par un administrateur",
    BROKER: "par un courtier",
    UNDERWRITER: "par un souscripteur",
  };

  const actionLabel = actionLabels[action] || "Modification";
  const roleLabel = roleLabels[userRole] || "par un utilisateur";

  return `${actionLabel} ${roleLabel}`;
}

// PATCH /api/quotes/[id] - Update quote

// Helper function to determine allowed status transitions based on role
function getStatusTransitions(
  currentStatus: string,
  userRole: string
): string[] {
  const transitions: Record<string, Record<string, string[]>> = {
    BROKER: {
      DRAFT: ["SUBMITTED"],
      SUBMITTED: ["DRAFT"], // Can revert to draft if needed
      COMPLEMENT_REQUIRED: ["SUBMITTED"],
      OFFER_SENT: ["ACCEPTED", "REJECTED"],
      ACCEPTED: [], // Cannot change once accepted
      REJECTED: [], // Cannot change once rejected
      EXPIRED: [], // Cannot change once expired
    },
    UNDERWRITER: {
      SUBMITTED: ["IN_PROGRESS", "COMPLEMENT_REQUIRED"],
      IN_PROGRESS: ["OFFER_READY", "COMPLEMENT_REQUIRED"],
      COMPLEMENT_REQUIRED: ["IN_PROGRESS"],
      OFFER_READY: ["OFFER_SENT"],
    },
    ADMIN: {
      // Admins can change any status to any other status
      DRAFT: [
        "SUBMITTED",
        "IN_PROGRESS",
        "COMPLEMENT_REQUIRED",
        "OFFER_READY",
        "OFFER_SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
      ],
      SUBMITTED: [
        "DRAFT",
        "IN_PROGRESS",
        "COMPLEMENT_REQUIRED",
        "OFFER_READY",
        "OFFER_SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
      ],
      IN_PROGRESS: [
        "DRAFT",
        "SUBMITTED",
        "COMPLEMENT_REQUIRED",
        "OFFER_READY",
        "OFFER_SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
      ],
      COMPLEMENT_REQUIRED: [
        "DRAFT",
        "SUBMITTED",
        "IN_PROGRESS",
        "OFFER_READY",
        "OFFER_SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
      ],
      OFFER_READY: [
        "DRAFT",
        "SUBMITTED",
        "IN_PROGRESS",
        "COMPLEMENT_REQUIRED",
        "OFFER_SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
      ],
      OFFER_SENT: [
        "DRAFT",
        "SUBMITTED",
        "IN_PROGRESS",
        "COMPLEMENT_REQUIRED",
        "OFFER_READY",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
      ],
      ACCEPTED: [
        "DRAFT",
        "SUBMITTED",
        "IN_PROGRESS",
        "COMPLEMENT_REQUIRED",
        "OFFER_READY",
        "OFFER_SENT",
        "REJECTED",
        "EXPIRED",
      ],
      REJECTED: [
        "DRAFT",
        "SUBMITTED",
        "IN_PROGRESS",
        "COMPLEMENT_REQUIRED",
        "OFFER_READY",
        "OFFER_SENT",
        "ACCEPTED",
        "EXPIRED",
      ],
      EXPIRED: [
        "DRAFT",
        "SUBMITTED",
        "IN_PROGRESS",
        "COMPLEMENT_REQUIRED",
        "OFFER_READY",
        "OFFER_SENT",
        "ACCEPTED",
        "REJECTED",
      ],
    },
  };

  return transitions[userRole]?.[currentStatus] || [];
}
