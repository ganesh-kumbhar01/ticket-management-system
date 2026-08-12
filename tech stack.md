# Tech Stack: AI Ticket Management System

This document outlines the technical architecture, tool stack, and deployment strategy for the project.

## 1. Core Framework & UI
- **Framework:** Next.js (React) using the App Router for both frontend UI and backend API routes.
- **Styling:** Tailwind CSS + shadcn/ui for a premium, responsive dashboard.

## 2. Database & Data Layer
- **Relational Database:** PostgreSQL
- **ORM:** Prisma
- **Vector Database (for AI):** `pgvector` extension for PostgreSQL, used to store Knowledge Base embeddings for semantic search.

## 3. Authentication
- **Strategy:** Custom JWT (JSON Web Tokens)
- **Library:** `jose` or `jsonwebtoken`
- **Implementation:** Verified via Next.js Middleware and API routes for Role-Based Access Control (Admin vs. Agent).

## 4. AI Engine
- **Provider:** Google Gemini SDK
- **Use Cases:** 
  - Auto-classifying incoming tickets (Category & Priority)
  - Summarizing long ticket threads
  - RAG (Retrieval-Augmented Generation) to draft suggested replies based on the Knowledge Base.

## 5. Email Integration
- **Ingestion:** Webhook endpoint (`/api/webhooks/email`) configured to receive incoming email payloads from a service provider like SendGrid or Resend.

## 6. Deployment Architecture
- **Hosting (Frontend & API):** [Vercel](https://vercel.com/) (Zero-config Next.js deployment, Edge Middleware for fast JWT verification).
- **Database Hosting:** [Supabase](https://supabase.com/) or [Neon](https://neon.tech/) (Serverless PostgreSQL with native `pgvector` support).
