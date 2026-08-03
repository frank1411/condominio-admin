import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifySupabaseToken, extractAuthToken } from "./supabase";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Try to extract token from Authorization header first, then cookie
    const authHeader = opts.req.headers.authorization;
    let token = extractAuthToken(authHeader);

    if (!token) {
      // Fallback: read from cookie
      const rawCookie = opts.req.headers.cookie;
      if (rawCookie) {
        const match = rawCookie.match(/(?:^|;\s*)app_session_id=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : null;
      }
    }

    if (token) {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser?.email) {
        const dbUser = await db.getUserByEmail(supabaseUser.email);
        if (dbUser) {
          user = dbUser;
        }

        // Auto-create user on first login if not found
        if (!user) {
          // Si el registro incluyó apartamento en el metadata, asignarlo al crear.
          const apartmentIdRaw = supabaseUser.user_metadata?.apartmentId;
          const apartmentId = typeof apartmentIdRaw === 'number' ? apartmentIdRaw : undefined;
          const newUser = await db.createUserFromSupabase({
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email.split("@")[0],
            supabaseUserId: supabaseUser.id,
            role: supabaseUser.user_metadata?.role ?? undefined,
            apartmentId,
          });
          if (newUser) {
            user = newUser;
          }
        }

        // Verify user is active and approved
        if (user && (!user.isActive || (user.approvalStatus && user.approvalStatus !== 'approved'))) {
          user = null;
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
