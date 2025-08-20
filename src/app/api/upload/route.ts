import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // File validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "Le fichier est trop volumineux (max 10MB)" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: "Type de fichier non autorisé" },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Authenticate with Supabase using email/password from .env
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.SUPABASE_UPLOAD_EMAIL!,
      password: process.env.SUPABASE_UPLOAD_PASSWORD!,
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return NextResponse.json(
        { success: false, error: "Erreur d'authentification pour l'upload" },
        { status: 500 }
      );
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = fileName || `${timestamp}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(uniqueFileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'upload du fichier" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(uniqueFileName);

    return NextResponse.json({
      success: true,
      data: {
        fileName: uniqueFileName,
        originalName: file.name,
        filePath: uploadData.path,
        fileSize: file.size,
        fileType: file.type,
        publicUrl: publicUrlData.publicUrl,
      },
    });

  } catch (error) {
    console.error("API Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}