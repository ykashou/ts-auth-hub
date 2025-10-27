import { Request } from "express";
import { storage } from "./storage";
import type { InsertAuditLog } from "@shared/schema";

/**
 * Audit logging utility for AuthHub
 * Captures important events, security actions, and user activities
 */

interface AuditLogParams {
  event: InsertAuditLog["event"];
  severity?: InsertAuditLog["severity"];
  action: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    // Skip logging audit_log.* events to prevent meta-logging
    if (params.event.startsWith("audit_log.")) {
      return;
    }

    const logEntry: InsertAuditLog = {
      event: params.event,
      severity: params.severity || "info",
      action: params.action,
      actorId: params.actorId || null,
      actorEmail: params.actorEmail || null,
      actorRole: params.actorRole || null,
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      targetName: params.targetName || null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    };

    await storage.createAuditLog(logEntry);
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    // Just log the error to console
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Create an audit log from an Express request with actor context
 */
export async function auditFromRequest(
  req: Request,
  params: Omit<AuditLogParams, "ipAddress" | "userAgent" | "actorId" | "actorEmail" | "actorRole">
): Promise<void> {
  const user = (req as any).user;
  
  await createAuditLog({
    ...params,
    actorId: user?.id,
    actorEmail: user?.email,
    actorRole: user?.role,
    ipAddress: (req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string,
    userAgent: req.headers["user-agent"],
  });
}

/**
 * Audit a successful login
 */
export async function auditLogin(
  userId: string,
  email: string | null,
  req: Request,
  method: "email" | "uuid" = "email"
): Promise<void> {
  await createAuditLog({
    event: method === "uuid" ? "auth.uuid_auth" : "auth.login",
    severity: "info",
    action: method === "uuid" 
      ? `User authenticated with UUID: ${userId}` 
      : `User logged in: ${email}`,
    actorId: userId,
    actorEmail: email || undefined,
    targetType: "user",
    targetId: userId,
    targetName: email || userId,
    ipAddress: (req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string,
    userAgent: req.headers["user-agent"],
  });
}

/**
 * Audit a failed login attempt
 */
export async function auditFailedLogin(
  email: string,
  reason: string,
  req: Request
): Promise<void> {
  await createAuditLog({
    event: "auth.failed_login",
    severity: "error",
    action: `Failed login attempt for: ${email}`,
    details: { reason },
    targetType: "user",
    targetName: email,
    ipAddress: (req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string,
    userAgent: req.headers["user-agent"],
  });
}

/**
 * Audit a user registration
 */
export async function auditRegistration(
  userId: string,
  email: string | null,
  role: string,
  req: Request
): Promise<void> {
  await createAuditLog({
    event: "auth.register",
    severity: "info",
    action: email 
      ? `New user registered: ${email} (${role})`
      : `New anonymous user registered: ${userId}`,
    actorId: userId,
    actorEmail: email || undefined,
    actorRole: role,
    targetType: "user",
    targetId: userId,
    targetName: email || userId,
    details: { role },
    ipAddress: (req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string,
    userAgent: req.headers["user-agent"],
  });
}

/**
 * Audit a logout
 */
export async function auditLogout(req: Request): Promise<void> {
  const user = (req as any).user;
  if (!user) return;

  await createAuditLog({
    event: "auth.logout",
    severity: "info",
    action: `User logged out: ${user.email || user.id}`,
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    targetType: "user",
    targetId: user.id,
    targetName: user.email || user.id,
    ipAddress: (req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string,
    userAgent: req.headers["user-agent"],
  });
}
