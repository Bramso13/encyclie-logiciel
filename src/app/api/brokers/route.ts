import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthAndRole } from "@/lib/api-utils";
import { generateReference } from "@/lib/api-utils";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  return withAuthAndRole(["ADMIN"], async (userId, userRole) => {
    try {
      const body = await request.json();
      const {
        name,
        email,
        companyName,
        phone,
        address,
        siretNumber,
        brokerCode,
      } = body;

      // Validate required fields
      if (
        !name ||
        !email ||
        !companyName ||
        !phone ||
        !address ||
        !brokerCode
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Tous les champs obligatoires doivent être remplis",
          },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: "Un utilisateur avec cet email existe déjà",
          },
          { status: 400 }
        );
      }

      // Check if there's already a pending invitation for this email
      const existingInvitation = await prisma.brokerInvitation.findUnique({
        where: { email },
      });

      if (existingInvitation && !existingInvitation.used) {
        return NextResponse.json(
          {
            success: false,
            error: "Une invitation est déjà en cours pour cet email",
          },
          { status: 400 }
        );
      }

      // Check if broker code already exists
      const existingBrokerCode = await prisma.brokerProfile.findFirst({
        where: { code: brokerCode },
      });

      if (existingBrokerCode) {
        return NextResponse.json(
          {
            success: false,
            error: "Ce code courtier existe déjà",
          },
          { status: 400 }
        );
      }

      // Check if broker code already exists in pending invitations
      const existingInvitationCode = await prisma.brokerInvitation.findFirst({
        where: { brokerCode, used: false },
      });

      if (existingInvitationCode) {
        return NextResponse.json(
          {
            success: false,
            error: "Ce code courtier est déjà réservé",
          },
          { status: 400 }
        );
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create broker invitation
      const brokerInvitation = await prisma.brokerInvitation.create({
        data: {
          name,
          email,
          companyName,
          phone,
          address,
          siretNumber,
          brokerCode,
          token: invitationToken,
          expires: tokenExpiry,
        },
      });

      // Send invitation email
      const emailResponse = await fetch(
        `${process.env.NEXTAUTH_URL}/api/email/invite-broker`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: brokerInvitation.email,
            name: brokerInvitation.name,
            invitationToken,
            brokerCode,
          }),
        }
      );

      if (!emailResponse.ok) {
        console.error("Failed to send invitation email");
        // Don't fail the whole operation if email fails
      }

      return NextResponse.json({
        success: true,
        data: {
          invitation: brokerInvitation,
          emailSent: emailResponse.ok,
        },
      });
    } catch (error) {
      console.error("Error creating broker:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la création du courtier",
        },
        { status: 500 }
      );
    }
  });
}
