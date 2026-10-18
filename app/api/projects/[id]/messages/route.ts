import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, getCurrentUser, Query, ID } from "@/lib/appwrite/server";

type RouteContext = { params: Promise<{ id: string }> };
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(50000),
  model: z.string().max(120).optional()
});

async function getAuthorizedProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, project: null, error: "unauthorized" as const };
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const projectsCollectionId = process.env.APPWRITE_PROJECTS_COLLECTION_ID;
  if (!databaseId || !projectsCollectionId || !process.env.APPWRITE_API_KEY) return { user, project: null, error: "not_configured" as const };
  try {
    const { databases } = createAdminClient();
    const project = await databases.getDocument({ databaseId, collectionId: projectsCollectionId, documentId: projectId });
    if (project.userId !== user.$id) return { user, project: null, error: "not_found" as const };
    return { user, project, error: null };
  } catch {
    return { user, project: null, error: "not_found" as const };
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await getAuthorizedProject(id);
  if (access.error === "unauthorized") return NextResponse.json({ error: "Sign in to view messages." }, { status: 401 });
  if (access.error === "not_configured") return NextResponse.json({ error: "Configure Appwrite database and collection IDs." }, { status: 503 });
  if (access.error) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const databaseId = process.env.APPWRITE_DATABASE_ID!;
  const collectionId = process.env.APPWRITE_MESSAGES_COLLECTION_ID;
  if (!collectionId) return NextResponse.json({ error: "Configure APPWRITE_MESSAGES_COLLECTION_ID." }, { status: 503 });
  try {
    const { databases } = createAdminClient();
    const result = await databases.listDocuments({ databaseId, collectionId, queries: [Query.equal("projectId", id), Query.equal("userId", access.user!.$id), Query.orderAsc("$createdAt"), Query.limit(500)] });
    return NextResponse.json({ messages: result.documents.map(doc => ({
      id: doc.$id, role: doc.role, content: doc.content, model: doc.model || null, created_at: doc.$createdAt
    })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load messages. Check the Appwrite messages collection attributes and indexes." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await getAuthorizedProject(id);
  if (access.error === "unauthorized") return NextResponse.json({ error: "Sign in to save messages." }, { status: 401 });
  if (access.error === "not_configured") return NextResponse.json({ error: "Configure Appwrite database and collection IDs." }, { status: 503 });
  if (access.error) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const collectionId = process.env.APPWRITE_MESSAGES_COLLECTION_ID;
  if (!collectionId) return NextResponse.json({ error: "Configure APPWRITE_MESSAGES_COLLECTION_ID." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Message content is required and must be 50,000 characters or fewer." }, { status: 400 });
  try {
    const { databases } = createAdminClient();
    const doc = await databases.createDocument({ databaseId: process.env.APPWRITE_DATABASE_ID!, collectionId, documentId: ID.unique(), data: {
      projectId: id, userId: access.user!.$id, role: parsed.data.role,
      content: parsed.data.content, model: parsed.data.model || ""
    } });
    return NextResponse.json({ message: { id: doc.$id, role: doc.role, content: doc.content, model: doc.model || null, created_at: doc.$createdAt } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save message. Check the Appwrite messages collection attributes and API key permissions." }, { status: 500 });
  }
}
