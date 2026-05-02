"use server";

import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";

export type NotificationType = "deposit" | "withdrawal" | "system";

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  related_tx_id: number | null;
  created_at: Date;
}

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedTxId?: number;
}

export async function getUserNotifications(): Promise<Notification[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const notifications = await sql<Notification[]>`
    SELECT id, user_id, title, message, type, is_read, related_tx_id, created_at
    FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return notifications;
}

export async function getUnreadCount(): Promise<number> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const result = await sql<{ count: number }[]>`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = ${userId} AND is_read = false
  `;
  const count = result[0]?.count ?? 0;
  return count;

  return result?.count ?? 0;
}

export async function markAsRead(notificationId: number): Promise<{ success: boolean }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const result = await execute`
    UPDATE notifications
    SET is_read = true
    WHERE id = ${notificationId} AND user_id = ${userId}
  `;

  return { success: result.rowCount > 0 };
}

export async function markAllAsRead(): Promise<{ success: boolean }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await execute`
    UPDATE notifications
    SET is_read = true
    WHERE user_id = ${userId} AND is_read = false
  `;

  return { success: true };
}

export async function createNotification({
  userId,
  title,
  message,
  type,
  relatedTxId,
}: CreateNotificationParams): Promise<{ id: number }> {
  const result = await sql`
    INSERT INTO notifications (user_id, title, message, type, is_read, related_tx_id, created_at)
    VALUES (${userId}, ${title}, ${message}, ${type}, false, ${relatedTxId ?? null}, NOW())
    RETURNING id
  `;

  return { id: result[0].id };
}

export async function sendNotificationEmail({
  email,
  name,
  title,
  message,
}: {
  email: string;
  name: string;
  title: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">RecoCycle Notification</h1>
      </div>
      <div style="padding: 32px 24px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">Halo <strong>${name}</strong>,</p>
        <p style="font-size: 16px; color: #374151;">${message}</p>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; 2026 RecoCycle Indonesia. All rights reserved.</p>
      </div>
    </div>
  `;

  if (!apiKey) {
    console.log("-----------------------------------------");
    console.log("[MOCK EMAIL SENT VIA SERVER ACTION]");
    console.log(`To: ${email}`);
    console.log(`Subject: ${title}`);
    console.log(`Missing RESEND_API_KEY. Set it in .env.local to send real emails.`);
    console.log("-----------------------------------------");

    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, mock: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RecoCycle <onboarding@resend.dev>",
        to: email,
        subject: title,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API Error:", data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}
