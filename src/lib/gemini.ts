import { GoogleGenAI } from '@google/genai';

function cleanAiOutput(text: string): string {
  let cleaned = text.trim();
  // Remove markdown code fences if wrapped
  cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();

  // Strip any internal chain-of-thought, self-prompts, or scratchpad reflection
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter((line) => {
    const l = line.trim().toLowerCase();
    if (l.startsWith('final polish:') || l.startsWith('thought:') || l.startsWith('(proceeding to generate') || l.startsWith('reasoning:')) return false;
    if (l.includes('"support operations team" sign-off?')) return false;
    if (l.startsWith('* "support operations team"')) return false;
    return true;
  });

  return filteredLines.join('\n').trim();
}

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

  // Active production models ordered by reliability, speed, and clean output
  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-pro-latest',
  ];

  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });

    for (const model of candidateModels) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (res && res.text) {
          const cleaned = cleanAiOutput(res.text);
          if (cleaned.length > 30) {
            return cleaned;
          }
        }
      } catch (err: any) {
        // Fallback to next candidate model if unavailable
      }
    }
  }

  // Dynamic Heuristic Fallback based on content keywords
  return generateSmartFallback(prompt);
}

function generateSmartFallback(text: string): string {
  const lower = text.toLowerCase();

  // 1. Hardware / Appliances / Physical Products (Dryer, Electronics, Damage, Replacement, Repair)
  if (
    lower.includes('dryer') ||
    lower.includes('hardware') ||
    lower.includes('device') ||
    lower.includes('machine') ||
    lower.includes('cold air') ||
    lower.includes('heat') ||
    lower.includes('power') ||
    lower.includes('repair') ||
    lower.includes('replacement') ||
    lower.includes('broken') ||
    lower.includes('not working') ||
    lower.includes('product')
  ) {
    return `Hello,\n\nThank you for contacting our support team regarding your product issue.\n\nWe understand how inconvenient hardware issues can be, and our specialist team is actively reviewing your ticket. Before initiating a warranty repair or replacement, please perform these quick checks:\n\n1. **Check Cool Shot / Mode Switch:** Ensure the Cool Shot or heat mode button is not locked or stuck in cool mode.\n2. **Clear Air Vents / Lint Filter:** Check the rear air intake for any dust build-up, as modern heating elements automatically disengage to prevent overheating when airflow is restricted.\n3. **Test Power Socket:** Plug the unit directly into a dedicated, high-wattage wall socket without an extension cord.\n\n**If the issue persists, please reply with the following details for immediate warranty/replacement processing:**\n- **Order ID / Invoice Number**\n- **Product Serial Number** (on the cord or base)\n- **Your current delivery address for replacement dispatch**\n\nOur support operations specialist will follow up directly on this ticket.\n\nWarm regards,\n**Support Operations Team**`;
  }

  // 2. Certificate / Name Correction / Academic Records
  if (
    lower.includes('certificate') ||
    lower.includes('spelling') ||
    lower.includes('name error') ||
    lower.includes('degree') ||
    lower.includes('marksheet')
  ) {
    return `Hello,\n\nThank you for reaching out regarding the name / detail correction on your Certificate.\n\nOur academic certification team has received your ticket and is actively processing your request. To ensure your re-issued certificate is 100% accurate:\n\n1. **Verify Student Portal Profile:** Ensure your full legal name is updated correctly in your account settings.\n2. **Provide Required Details for Re-Issuance:**\n   - **Full Legal Name** (exactly as it should appear on the certificate)\n   - **Course Name & Completion Date**\n   - **Copy of Government ID / Photo ID** (to verify identity and prevent unauthorized modifications)\n\nOur team is reviewing this ticket and will generate and deliver your updated verified certificate directly to your email.\n\nWarm regards,\n**Support Operations Team**`;
  }

  // 3. Invoice & Billing Discrepancy (Wrong amount, unexpected charge, taxes, discounts)
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

  // 4. Payment Failure / Amount Deducted / Refund
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

  // 5. Course / Academic / Video / Assignment / Quiz
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

  // 6. Login / Password / Authentication / Session
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

  // 7. Default General Technical Support
  return `Hello,\n\nThank you for reaching out to our support team. We have received your inquiry and our support agents are actively reviewing your case.\n\nHere are quick troubleshooting steps that often resolve common difficulties:\n\n1. **Refresh Session & Cache:** Try clearing your browser cache and refreshing the page.\n2. **Device & Network:** Verify that your internet connection is stable and disable any restrictive VPN or browser extensions.\n3. **Detailed Information:** If this issue persists, reply directly to this email with any error codes or screenshots you encountered.\n\nOur live support agents are reviewing your ticket in real-time and will provide direct assistance promptly.\n\nWarm regards,\n**Support Operations Team**`;
}
