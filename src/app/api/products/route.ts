import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { CreateInsuranceProductSchema } from "@/lib/validations";

// GET /api/products - Récupérer tous les produits ou seulement les actifs
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const products = await prisma.insuranceProduct.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/products - Créer un nouveau produit (admin seulement)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Accès interdit - admin requis" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreateInsuranceProductSchema.parse(body);

    const product = await prisma.insuranceProduct.create({
      data: {
        ...validatedData,
        createdBy: {
          connect: {
            id: session.user.id
          }
        }
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: product
    }, { status: 201 });

  } catch (error) {
    console.error("Erreur lors de la création du produit:", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Données invalides", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}