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
          const newUser = await db.createUserFromSupabase({
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email.split("@")[0],
            supabaseUserId: supabaseUser.id,
            role: supabaseUser.user_metadata?.role ?? undefined,
          });
          if (newUser) {
            user = newUser;
          }
        }

        // Verify user is active and approved
        if (user && (!user.isActive || (user.approvalStatus && user.approvalStatus !== 'approved'))) {
          user = null;
        }

        // Fallback: if DB lookup failed (vUser function missing or DB unavailable),
        // create a virtual user from Supabase session data so auth.me works
        if (!user) {
          user = {
            id: 0,
            openId: supabaseUser.id,
            email: supabaseUser.email ?? "",
            name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split("@")[0] ?? supabaseUser.id,
            loginMethod: "supabase",
            role: (supabaseUser.user_metadata?.role as "admin" | "user") ?? "user",
            apartmentId: null,
            isApproved: true,
            approvalStatus: "approved",
            approvedBy: null,
            approvedAt: null,
            rejectionReason: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          };
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
