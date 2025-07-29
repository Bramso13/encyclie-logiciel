import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { auth } from "./auth";
import { ApiResponse } from "./validations";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: status < 400,
      data,
      message,
    },
    { status }
  );
}

export function createErrorResponse(
  error: string | Error,
  status: number = 500
): NextResponse<ApiResponse> {
  const message = error instanceof Error ? error.message : error;

  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error("API Error:", error);

  if (error instanceof ApiError) {
    return createErrorResponse(error.message, error.status);
  }

  // if (error instanceof ZodError) {
  //   const messages = error.errors?.map(err => `${err.path.join(".")}: ${err.message}`) || ["Validation error"];
  //   return createErrorResponse(`Validation error: ${messages.join(", ")}`, 400);
  // }

  if (error instanceof Error) {
    return createErrorResponse(error.message, 500);
  }

  return createErrorResponse("Une erreur inconnue s'est produite", 500);
}

export function generateReference(prefix: string): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `${prefix}${year}${random}`;
}

export async function withAuth<T>(
  handler: (userId: string, userRole: string) => Promise<T>
): Promise<T> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new ApiError(401, "Non autorisé - session invalide");
  }

  return handler(session.user.id, session.user.role || "BROKER");
}

export async function withAuthAndRole<T>(
  allowedRoles: string[],
  handler: (userId: string, userRole: string) => Promise<T>
): Promise<T> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new ApiError(401, "Non autorisé - session invalide");
  }

  const userRole = session.user.role || "BROKER";

  if (!allowedRoles.includes(userRole)) {
    throw new ApiError(403, "Accès refusé - rôle insuffisant");
  }

  return handler(session.user.id, userRole);
}

export function validatePagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
}

export function buildWhereClause(filters: Record<string, any>) {
  const where: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      // Handle date range filters
      if (key.endsWith("From")) {
        const field = key.replace("From", "");
        where[field] = { ...where[field], gte: new Date(value) };
      } else if (key.endsWith("To")) {
        const field = key.replace("To", "");
        where[field] = { ...where[field], lte: new Date(value) };
      } else if (key.endsWith("Before")) {
        const field = key.replace("Before", "");
        where[field] = { lte: new Date(value) };
      } else {
        where[key] = value;
      }
    }
  });

  return where;
}
