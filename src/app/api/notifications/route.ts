import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, createApiResponse, handleApiError, validatePagination, buildWhereClause } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    return await withAuth(async (userId, userRole) => {
      const { searchParams } = new URL(request.url);
      const { page, limit, skip, take } = validatePagination(searchParams);
      
      const filters = {
        userId,
        type: "GENERAL",
        isRead: searchParams.get("isRead") === "true" ? true : searchParams.get("isRead") === "false" ? false : undefined,
        isUrgent: searchParams.get("isUrgent") === "true" ? true : searchParams.get("isUrgent") === "false" ? false : undefined,
      };

      const search = searchParams.get("search");
      
      const where = buildWhereClause(filters);
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { message: { contains: search, mode: "insensitive" } },
        ];
      }

      // Get total count for pagination
      const total = await prisma.notification.count({ where });

      // Get notifications with pagination
      const notifications = await prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              companyName: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      return createApiResponse({
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await withAuth(async (senderId, senderRole) => {
      const body = await request.json();
      const { title, message, userId, isUrgent = false } = body;

      // Validate required fields
      if (!title || !message || !userId) {
        return createApiResponse(
          null,
          "Les champs titre, message et destinataire sont obligatoires",
          400
        );
      }

      // Check if recipient user exists
      const recipient = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!recipient) {
        return createApiResponse(
          null,
          "Destinataire introuvable",
          404
        );
      }

      const notification = await prisma.notification.create({
        data: {
          type: "GENERAL",
          title,
          message,
          userId,
          isUrgent,
          sentAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              companyName: true,
            },
          },
        },
      });

      return createApiResponse(notification, "Message envoyé avec succès", 201);
    });
  } catch (error) {
    return handleApiError(error);
  }
}