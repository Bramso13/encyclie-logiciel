import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { DocumentUploadSchema } from "@/lib/validations";
import { 
  createApiResponse, 
  handleApiError, 
  withAuth,
  ApiError
} from "@/lib/api-utils";

// POST /api/quotes/[id]/documents - Upload document for quote
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId, userRole) => {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const documentType = formData.get("documentType") as string;

      if (!file) {
        throw new ApiError(400, "Aucun fichier fourni");
      }

      // Validate document type
      const validatedData = DocumentUploadSchema.parse({
        documentType,
        relatedEntityId: params.id,
        relatedEntityType: "quote"
      });

      // Check if quote exists and user has access
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { 
          id: true, 
          brokerId: true, 
          reference: true 
        }
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // File validation
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new ApiError(400, "Le fichier est trop volumineux (max 10MB)");
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new ApiError(400, "Type de fichier non autorisé");
      }

      // Create upload directory
      const uploadDir = join(process.cwd(), "uploads", "quotes", params.id);
      await mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split(".").pop();
      const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${extension}`;
      const filePath = join(uploadDir, fileName);

      // Write file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Save to database
      const document = await prisma.quoteDocument.create({
        data: {
          fileName,
          originalName: file.name,
          filePath: filePath,
          fileType: file.type,
          fileSize: file.size,
          documentType: validatedData.documentType as any,
          quoteId: params.id
        }
      });

      return createApiResponse(
        document,
        "Document téléchargé avec succès",
        201
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/quotes/[id]/documents - List documents for quote
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId, userRole) => {
      // Check if quote exists and user has access
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { 
          id: true, 
          brokerId: true 
        }
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // Get documents
      const documents = await prisma.quoteDocument.findMany({
        where: { quoteId: params.id },
        select: {
          id: true,
          fileName: true,
          originalName: true,
          documentType: true,
          fileSize: true,
          uploadedAt: true
        },
        orderBy: { uploadedAt: "desc" }
      });

      return createApiResponse(documents);
    });
  } catch (error) {
    return handleApiError(error);
  }
}