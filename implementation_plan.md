# Implementation Plan: AI Ticket Management System

This document outlines the technical architecture, data models, and deployment strategy for the AI Ticket Management System.

## 1. Tech Stack
- **Framework:** Next.js (React) using the App Router for both frontend UI and backend API routes.
- **Styling:** Tailwind CSS + shadcn/ui for a premium, responsive dashboard.
- **Database:** PostgreSQL (managed via Prisma ORM) with `pgvector` for AI Knowledge Base embeddings.
- **Authentication:** Custom JWT (JSON Web Tokens) using the `jose` library (or `jsonwebtoken`) in Next.js middleware and API routes to verify Admin/Agent access.
- **AI Engine:** Google Gemini SDK for ticket classification, summarization, and RAG drafting.
- **Email Ingestion:** Webhook endpoint (`/api/webhooks/email`) to receive payloads from services like SendGrid or Resend.

## 2. Deployment Strategy

For a Next.js full-stack application with a PostgreSQL database, the most robust and scalable deployment architecture is:

### 2.1 Hosting (Frontend & API)
- **Platform:** [Vercel](https://vercel.com/)
- **Why:** Vercel is the creator of Next.js. It provides zero-configuration deployments, automatic scaling, edge functions (great for fast JWT verification), and seamless GitHub integration.

### 2.2 Database Hosting (PostgreSQL + pgvector)
- **Platform:** [Supabase](https://supabase.com/) or [Neon](https://neon.tech/)
- **Why:** Both offer generous free tiers for serverless PostgreSQL. More importantly, both have native, one-click support for the `pgvector` extension, which is strictly required for our AI Knowledge Base to function.

### 2.3 Environment Variables (Secrets)
During deployment, the Vercel dashboard will hold our secrets:
- `DATABASE_URL`: Connection string to Supabase/Neon.
- `JWT_SECRET`: The cryptographic key used to sign and verify our JWTs.
- `GEMINI_API_KEY`: API key for the AI generation.

## 3. Data Model (Schema)

### 3.1 User
- `id` (UUID)
- `email` (String, unique)
- `passwordHash` (String)
- `role` (Enum: `ADMIN`, `AGENT`)

### 3.2 Ticket
- `id` (UUID)
- `subject` (String)
- `status` (Enum: `NEW`, `OPEN`, `PENDING_CUSTOMER`, `RESOLVED`, `CLOSED`)
- `category` (String - e.g., "Billing", "Tech Support")
- `priority` (Enum: `LOW`, `NORMAL`, `HIGH`, `URGENT`)
- `assignedAgentId` (UUID, optional)
- `studentEmail` (String)

### 3.3 Message
- `id` (UUID)
- `ticketId` (UUID, foreign key)
- `senderType` (Enum: `STUDENT`, `AGENT`, `AI_DRAFT`)
- `content` (Text)
- `createdAt`

### 3.4 Knowledge Article (RAG)
- `id` (UUID)
- `title` (String)
- `content` (Text)
- `embedding` (Vector)

## 4. Implementation Phases

- **Phase 1 (Foundation):** Init Next.js, configure Tailwind/shadcn, setup Prisma and PostgreSQL, and implement the JWT login/registration flow. Create the Admin seed script.
- **Phase 2 (Dashboard):** Build the Ticket List and Ticket Detail UI components.
- **Phase 3 (AI integration):** Set up `pgvector`, build the Knowledge Base CRUD UI, and implement Gemini for auto-classification and suggested replies.
- **Phase 4 (Ingestion):** Build the email webhook endpoint.

## User Review Required

> [!IMPORTANT]
> Please review the Tech Stack and Deployment Strategy outlined above. If this looks perfect to you, we can conclude the planning phase, and I will execute Phase 1 to generate the Next.js project!
