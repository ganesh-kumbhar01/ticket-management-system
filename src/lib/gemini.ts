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

  // Active production models ordered by speed, capability and reliability
  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-pro-latest',
    'gemini-flash-latest',
  ];

  if (apiKey) {
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.35,
            maxOutputTokens: options?.maxTokens ?? 1600,
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

  // Dynamic Heuristic Fallback based on content keywords
  return generateSmartFallback(prompt);
}

function generateSmartFallback(text: string): string {
  const lower = text.toLowerCase();

  // 1. Certificate / Name Correction / Academic Records
  if (
    lower.includes('certificate') ||
    lower.includes('spelling') ||
    lower.includes('name error') ||
    lower.includes('degree') ||
    lower.includes('marksheet')
  ) {
    return `Hello,\n\nThank you for reaching out regarding the name / detail correction on your Certificate.\n\nOur academic certification team has received your ticket and is actively processing your request. To ensure your re-issued certificate is 100% accurate:\n\n1. **Verify Student Portal Profile:** Ensure your full legal name is updated correctly in your account settings.\n2. **Provide Required Details for Re-Issuance:**\n   - **Full Legal Name** (exactly as it should appear on the certificate)\n   - **Course Name & Completion Date**\n   - **Copy of Government ID / Photo ID** (to verify identity and prevent unauthorized modifications)\n\nOur team is reviewing this ticket and will generate and deliver your updated verified certificate directly to your email.\n\nWarm regards,\n**Support Operations Team**`;
  }

  // 2. Invoice & Billing Discrepancy (Wrong amount, unexpected charge, taxes, discounts)
  if (
    lower.includes('invoice') ||
    lower.includes('incorrect amount') ||
    lower.includes('wrong amount') ||
    lower.includes('overcharge') ||
    lower.includes('extra charge') ||
    lower.includes('gst') ||
    lower.includes('tax') ||
    lower.includes('discount not applied') ||
    lower.includes('coupon')
  ) {
    return `Hello,\n\nThank you for reaching out regarding the amount discrepancy on your invoice.\n\nOur billing team has been notified of your ticket and is actively reviewing your account ledger. To help you understand and resolve this quickly:\n\n1. **Common Causes for Invoicing Variations:**\n- **Taxes (GST / VAT):** Course prices displayed on marketing pages may exclude mandatory government taxes (such as 18% GST), which are calculated at checkout.\n- **Coupon & Promo Code Verification:** If a discount code was entered, verify whether it met minimum cart criteria or expired prior to payment.\n- **Currency Conversion & Gateway Surcharges:** International card payments may incur nominal bank conversion or gateway processing adjustments.\n\n2. **Immediate Checklist for Invoice Rectification:**\nTo ensure our finance specialist can correct and re-issue your updated invoice without delay, please reply directly to this email with:\n- **Your Order ID or Invoice Number**\n- **The Expected Amount vs. The Amount Charged**\n- **A copy or screenshot of the invoice/receipt you received**\n\nOur live support agents are reviewing your inquiry and will update you directly with a corrected invoice or necessary billing adjustment.\n\nWarm regards,\n**Support Operations Team**`;
  }

  // 3. Payment Failure / Amount Deducted / Refund
  if (
    lower.includes('payment') ||
    lower.includes('refund') ||
    lower.includes('deduct') ||
    lower.includes('debited') ||
    lower.includes('charged') ||
    lower.includes('transaction') ||
    lower.includes('money') ||
    lower.includes('bank') ||
    lower.includes('utr')
  ) {
    return `Hello,\n\nThank you for contacting our support team regarding your payment inquiry.\n\nWe understand that unexpected charges or failed transactions can be concerning. Here are the immediate steps and timeline regarding your payment:\n\n1. **Check for Automatic Bank Reversal (24–48 Hours):**\nIf a transaction failed during checkout but money was deducted, the amount is usually on a temporary hold by your bank and was not captured by our payment gateway. Most banking networks automatically reverse and release these funds back to your original payment method within **24 to 48 hours** (or 3–5 business days).\n\n2. **Verify Account & Order Status:**\nPlease check your student dashboard to confirm if your course access or subscription was activated.\n\n3. **Provide Transaction Details (If not reversed):**\nIf the deducted amount does not return to your account within 3 business days, please reply directly to this email with:\n- **Transaction Reference / UTR Number**\n- **Date and exact amount debited**\n- **Screenshot of the debit SMS or bank receipt (with confidential details masked)**\n\nOur billing team has this ticket in their active queue and will trace the transaction with our payment partner to ensure complete resolution.\n\nWarm regards,\n**Support Operations Team**`;
  }

  // 4. Course / Academic / Video / Assignment / Quiz
  if (
    lower.includes('course') ||
    lower.includes('video') ||
    lower.includes('player') ||
    lower.includes('assignment') ||
    lower.includes('quiz') ||
    lower.includes('lesson') ||
    lower.includes('upload') ||
    lower.includes('file size')
  ) {
    return `Hello,\n\nThank you for reaching out regarding your course and learning portal request.\n\nHere are tailored troubleshooting steps to resolve your access and submission inquiry:\n\n1. **Browser Cache & Hardware Acceleration:** Clear your browser cache and cookies, or try accessing the lesson in an Incognito/Private window with hardware acceleration enabled in browser settings.\n2. **File Upload & Submissions:** If submitting large project files exceeding portal upload limits, consider compressing files or uploading the file to a cloud drive (Google Drive / OneDrive) and submitting the shared link.\n3. **Enrollment Sync:** If a completed lesson or certificate is not unlocking, log out completely and log back in to refresh your enrollment tokens.\n\nIf you continue to experience difficulty, simply reply directly to this email with the course/lesson name and error screenshot, and our academic specialist will assist you.\n\nWarm regards,\n**Support Operations Team**`;
  }

  // 5. Login / Password / Authentication / Session
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
    return `Hello,\n\nThank you for reaching out to our support team regarding your account access.\n\nHere are a few quick steps that resolve most authentication and login issues:\n\n1. **Password Reset Link:** Use the "Forgot Password" link on the login page to request a fresh, one-time secure reset link.\n2. **Clear Session & Cookies:** Clear your browser cache/cookies or attempt login from a Private/Incognito window.\n3. **Verify Email Address:** Ensure you are entering the exact registered email address without extra spaces.\n\nIf you still cannot access your account, reply to this email, and our security team will verify your identity and assist you.\n\nWarm regards,\n**Support Operations Team**`;
  }

  // 6. Default General Technical Support
  return `Hello,\n\nThank you for reaching out to our support team. We have received your inquiry and our support agents are actively reviewing your case.\n\nHere are quick troubleshooting steps that often resolve common difficulties:\n\n1. **Refresh Session & Cache:** Try clearing your browser cache and refreshing the page.\n2. **Device & Network:** Verify that your internet connection is stable and disable any restrictive VPN or browser extensions.\n3. **Detailed Information:** If this issue persists, reply directly to this email with any error codes or screenshots you encountered.\n\nOur live support agents are reviewing your ticket in real-time and will provide direct assistance promptly.\n\nWarm regards,\n**Support Operations Team**`;
}
