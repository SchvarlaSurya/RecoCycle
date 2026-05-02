"use server";

export async function sendBalanceNotificationEmail({
  email,
  name,
  amount,
  type, // "deposit" | "withdrawal"
  balance
}: {
  email: string;
  name: string;
  amount: number;
  type: string;
  balance: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const isDeposit = type === "deposit";
  
  const actionText = isDeposit ? "bertambah" : "berkurang";
  const sourceText = isDeposit ? "Hasil Setoran Sampah" : "Penarikan Saldo";
  const color = isDeposit ? "#10b981" : "#0f172a";

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: ${color}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">RecoCycle Notification</h1>
      </div>
      <div style="padding: 32px 24px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">Halo <strong>${name}</strong>,</p>
        <p style="font-size: 16px; color: #374151;">Saldo Anda telah <strong>${actionText}</strong> sebesar:</p>
        
        <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px; text-align: center;">
          <h2 style="font-size: 32px; color: ${color}; margin: 0;">Rp ${amount.toLocaleString("id-ID")}</h2>
          <p style="font-size: 14px; color: #6b7280; margin: 8px 0 0 0;">Keterangan: ${sourceText}</p>
        </div>

        <p style="font-size: 16px; color: #374151;">Total saldo Anda saat ini adalah <strong>Rp ${balance.toLocaleString("id-ID")}</strong>.</p>
        
        ${isDeposit 
          ? `<p style="font-size: 14px; color: #059669; margin-top: 24px;">Terima kasih telah berkontribusi menjaga kelestarian bumi! 🌱</p>`
          : `<p style="font-size: 14px; color: #374151; margin-top: 24px;">Dana penarikan sedang kami proses ke rekening Anda.</p>`
        }
      </div>
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; 2026 RecoCycle Indonesia. All rights reserved.</p>
      </div>
    </div>
  `;

  // Provide fallback Mock implementation if API key is not yet available
  if (!apiKey) {
    console.log("-----------------------------------------");
    console.log("[MOCK EMAIL SENT VIA SERVER ACTION]");
    console.log(`To: ${email}`);
    console.log(`Subject: Saldo Anda ${actionText} Rp ${amount}`);
    console.log(`Missing RESEND_API_KEY. Set it in .env.local to send real emails.`);
    console.log("-----------------------------------------");
    
    // Simulate network delay
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
        subject: `Notifikasi Saldo RecoCycle - Rp ${amount.toLocaleString("id-ID")}`,
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
