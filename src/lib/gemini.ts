export async function generateGeminiContent(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
    maxTokens?: number;
    fallbackCategoryHint?: string;
  }
): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  const candidateModels = [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-2.5-flash-lite',
  ];

  if (apiKey) {
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.3,
            maxOutputTokens: options?.maxTokens ?? 1200,
          },
        };

        if (options?.systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: options.systemInstruction }],
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      } catch (err) {
        // try next candidate model
      }
    }
  }

  // Smart Contextual Fallback based on content keywords
  return generateSmartFallback(prompt);
}

function generateSmartFallback(text: string): string {
  const lower = text.toLowerCase();

  // 1. Payment / Billing / Refund / Deduction
  if (
    lower.includes('payment') ||
    lower.includes('refund') ||
    lower.includes('deduct') ||
    lower.includes('debited') ||
    lower.includes('charged') ||
    lower.includes('invoice') ||
    lower.includes('billing') ||
    lower.includes('transaction') ||
    lower.includes('money') ||
    lower.includes('bank') ||
    lower.includes('utr')
  ) {
    return `Hello,\n\nThank you for contacting our support team regarding your payment/refund inquiry.\n\nWe understand that unexpected charges or failed transactions can be concerning. Here are the immediate steps and timeline regarding your payment:\n\n1. **Check for Automatic Bank Reversal (24–48 Hours):**\nIf a transaction failed during processing, the amount is usually placed on a temporary hold by your bank and not received by our payment gateway. Most banks automatically reverse and release these funds back to your original payment method within **24 to 48 hours** (or 3–5 business days).\n\n2. **Verify Account & Invoice Status:**\nPlease check your account billing history to confirm if the subscription or order was activated.\n\n3. **Provide Transaction Details (If not reversed):**\nIf the deducted amount does not return to your account within 3 business days, please reply directly to this email with:\n- **Transaction ID / Reference Number (UTR)**\n- **Date and exact amount debited**\n- **Screenshot of the bank debit confirmation (with private details hidden)**\n\nOur billing specialist team will immediately trace the payment with our payment gateway and issue an instant resolution or refund.\n\nWarm regards,\n**AI Support Assistant**`;
  }

  // 2. Course / Academic / Video / Certificate
  if (
    lower.includes('course') ||
    lower.includes('video') ||
    lower.includes('player') ||
    lower.includes('assignment') ||
    lower.includes('certificate') ||
    lower.includes('quiz') ||
    lower.includes('lesson')
  ) {
    return `Hello,\n\nThank you for reaching out regarding your course content access.\n\nHere are quick troubleshooting steps to resolve media and learning portal issues:\n\n1. **Browser Cache & Hardware Acceleration:** Clear your browser cache and cookies, or try accessing the lesson in an Incognito/Private window with hardware acceleration enabled.\n2. **Network & DRM Support:** Ensure your browser is up to date and that DRM/Protected content playback is enabled in browser settings.\n3. **Enrollment Sync:** If a completed lesson or certificate is not unlocking, log out completely and log back in to force a permission refresh.\n\nIf you continue to experience playback or assignment errors, simply reply to this email with the course name and lesson title, and a support specialist will assist you directly.\n\nWarm regards,\n**AI Support Assistant**`;
  }

  // 3. Login / Password / Authentication / Session
  if (
    lower.includes('login') ||
    lower.includes('password') ||
    lower.includes('signin') ||
    lower.includes('sign in') ||
    lower.includes('auth') ||
    lower.includes('otp') ||
    lower.includes('2fa') ||
    lower.includes('reset')
  ) {
    return `Hello,\n\nThank you for reaching out to our support team regarding your account access.\n\nHere are a few quick steps that resolve most authentication and login issues:\n\n1. **Password Reset Link:** Use the "Forgot Password" link on the login page to request a fresh, one-time secure reset link.\n2. **Clear Session & Cookies:** Clear your browser cache/cookies or attempt login from a Private/Incognito window.\n3. **Verify Email Address:** Ensure you are entering the exact registered email address without extra spaces.\n\nIf you still cannot access your account, reply to this email, and our security team will verify your identity and assist you.\n\nWarm regards,\n**AI Support Assistant**`;
  }

  // 4. Default General Technical Support
  return `Hello,\n\nThank you for reaching out to our support team. We have received your request and our team is actively looking into it.\n\nHere are quick steps that often resolve common technical difficulties:\n\n1. **Refresh Session & Cache:** Try clearing your browser cache and refreshing the page.\n2. **Device & Network:** Verify that your internet connection is stable and disable any restrictive VPN or browser extensions.\n3. **Detailed Information:** If this issue persists, reply to this email with any error codes or screenshots you encountered.\n\nOur live support agents will review your ticket and provide direct assistance promptly.\n\nWarm regards,\n**AI Support Assistant**`;
}
