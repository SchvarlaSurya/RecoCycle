
export interface QRParseResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export function parseQRCode(qrData: string): QRParseResult {
  if (!qrData || typeof qrData !== "string") {
    return { success: false, error: "QR code is empty or invalid" };
  }

  const trimmed = qrData.trim();

  if (trimmed.startsWith("wastebank://scan/")) {
    const userId = trimmed.replace("wastebank://scan/", "").trim();
    if (!userId) {
      return { success: false, error: "User ID not found in QR code" };
    }
    return { success: true, userId };
  }

  if (trimmed.includes("wastebank://")) {
    return { success: false, error: "Unknown QR format. Expected: wastebank://scan/{user_id}" };
  }

  return { success: true, userId: trimmed };
}

export function generateUserQR(userId: string): string {
  return `wastebank://scan/${userId}`;
}