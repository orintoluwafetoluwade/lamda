import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, getCurrentUser, Query, ID } from "@/lib/appwrite/server";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000).optional()
});

function databaseConfig() {
  return {
    databaseId: process.env.APPWRITE_DATABASE_ID || "",
    collectionId: process.env.APPWRITE_PROJECTS_COLLECTION_ID || ""
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your projects." }, { status: 401 });
  const { databaseId, collectionId } = databaseConfig();
  if (!databaseId || !collectionId || !process.env.APPWRITE_API_KEY) return NextResponse.json({ error: "Configure the Appwrite database ID, projects collection ID, and server API key." }, { status: 503 });
  try {
    const { databases } = createAdminClient();
    const result = await databases.listDocuments({ databaseId, collectionId, queries: [Query.equal("userId", user.$id), Query.orderDesc("$updatedAt"), Query.limit(100)] });
    return NextResponse.json({ projects: result.documents.map(doc => ({
      id: doc.$id, name: doc.name, description: doc.description || "",
      repository_full_name: doc.repositoryFullName || null, default_branch: doc.defaultBranch || "main",
      created_at: doc.$createdAt, updated_at: doc.$updatedAt
    })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load projects. Check that the Appwrite projects collection has a userId string attribute and the API key has database permissions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a project." }, { status: 401 });
  const { databaseId, collectionId } = databaseConfig();
  if (!databaseId || !collectionId || !process.env.APPWRITE_API_KEY) return NextResponse.json({ error: "Configure the Appwrite database ID, projects collection ID, and server API key." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Project name is required and must be 120 characters or fewer." }, { status: 400 });
  try {
    const { databases } = createAdminClient();
    const doc = await databases.createDocument({ databaseId, collectionId, documentId: ID.unique(), data: {
      userId: user.$id, name: parsed.data.name, description: parsed.data.description || "",
      repositoryFullName: "", defaultBranch: "main"
    } });
    return NextResponse.json({ project: {
      id: doc.$id, name: doc.name, description: doc.description || "",
      repository_full_name: doc.repositoryFullName || null, default_branch: doc.defaultBranch || "main",
      created_at: doc.$createdAt, updated_at: doc.$updatedAt
    } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save project. Check the Appwrite collection attributes and server API key permissions." }, { status: 500 });
  }
}
