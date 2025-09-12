import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  createApiResponse, 
  handleApiError, 
  withAuth, 
  withAuthAndRole,
  ApiError 
} from "@/lib/api-utils";

// TODO: Implémenter les méthodes selon les besoins
