import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { formFields, stepConfig, mappingFields, ...otherFields } = body;

    // Vérifier que le produit existe
    const existingProduct = await prisma.insuranceProduct.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = { ...otherFields };
    
    if (formFields !== undefined) {
      updateData.formFields = formFields;
    }
    
    if (stepConfig !== undefined) {
      updateData.stepConfig = stepConfig;
    }
    
    if (mappingFields !== undefined) {
      updateData.mappingFields = mappingFields;
    }

    // Mettre à jour le produit
    const updatedProduct = await prisma.insuranceProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    return NextResponse.json(
      { success: false, error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const product = await prisma.insuranceProduct.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du produit:", error);
    return NextResponse.json(
      { success: false, error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Modifier un produit (admin seulement)
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
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

    const product = await prisma.insuranceProduct.update({
      where: {
        id: params.id,
      },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour du produit:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Supprimer un produit (admin seulement)
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
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

    // Vérifier s'il y a des devis liés à ce produit
    const quotesCount = await prisma.quote.count({
      where: {
        productId: params.id,
      },
    });

    if (quotesCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de supprimer - des devis utilisent ce produit",
        },
        { status: 400 }
      );
    }

    await prisma.insuranceProduct.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produit supprimé avec succès",
    });
  } catch (error: any) {
    console.error("Erreur lors de la suppression du produit:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
