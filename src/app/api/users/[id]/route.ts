import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyName: true,
        phone: true,
        address: true,
        siretNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Utilisateur non trouvé",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération de l'utilisateur",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Utilisateur non trouvé",
        },
        { status: 404 }
      );
    }

    // If email is being updated, check for duplicates
    if (body.email && body.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: body.email,
          id: { not: id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          {
            success: false,
            error: "Un utilisateur avec cet email existe déjà",
          },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyName: true,
        phone: true,
        address: true,
        siretNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la mise à jour de l'utilisateur",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Utilisateur non trouvé",
        },
        { status: 404 }
      );
    }

    // Check if user has associated data that would prevent deletion
    const hasQuotes = await prisma.quote.findFirst({
      where: { brokerId: id },
    });

    if (hasQuotes) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de supprimer un utilisateur avec des devis associés",
        },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la suppression de l'utilisateur",
      },
      { status: 500 }
    );
  }
}