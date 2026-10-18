import { Account, Client, Databases, ID, Query, type Models } from "node-appwrite";
import { cookies } from "next/headers";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export function appwriteConfigured() {
  return Boolean(endpoint && projectId);
}

export function createSessionClient(sessionSecret: string) {
  if (!endpoint || !projectId) throw new Error("Appwrite endpoint and project ID are required.");
  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  if (sessionSecret) client.setSession(sessionSecret);
  return { account: new Account(client), client };
}

export function createAdminClient() {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) throw new Error("Appwrite server configuration is incomplete.");
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return { account: new Account(client), databases: new Databases(client), client };
}

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  const secret = (await cookies()).get("forgepilot_session")?.value;
  if (!secret || !appwriteConfigured()) return null;
  try {
    const { account } = createSessionClient(secret);
    return await account.get();
  } catch {
    return null;
  }
}

export async function getCurrentUserFromRequest() {
  return getCurrentUser();
}

export { ID, Query };
