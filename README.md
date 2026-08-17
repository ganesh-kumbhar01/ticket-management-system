<div align="center">

# 🎫 Enterprise Ticket Management & AI Operations Platform

An enterprise-grade, AI-powered customer support and operations platform built with **Next.js 16 (Turbopack)**, **React 19**, **Prisma ORM 7**, **PostgreSQL (pgvector)**, and **Google Gemini AI**.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.9.1-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash-8E75B2?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

[**Live Production Demo**](https://ticket-management-system-3fy5.vercel.app/dashboard) • [**Report a Bug**](https://github.com/ganesh-kumbhar01/ticket-management-system/issues)

</div>

---

## 🌟 Key System Modules & Features

### 1. 🤖 AI Knowledge First-Responder & Dynamic Domain Engine
- **Hyper-Personalized Solutions:** Instant AI resolution dispatched via email for any customer inquiry (e.g. invoice discrepancies, payment double debits, certificate spelling typos, 45MB file upload limits, video player DRM).
- **Semantic Vector Search:** Integrates **pgvector** and `text-embedding-004` to match customer problems against verified internal Knowledge Base articles.
- **Live Queue Assurance:** Reassures customers that their case remains active in the live human support queue without premature closure buttons.

### 2. 🧠 Horizon AI — Operations Advisor & Crisis Simulator
- **Daily Executive Briefing:** Real-time situational awareness and system health index score (0–100).
- **Interactive "What-If" Stress-Testing Sandbox:** Allows administrators to input custom hypothetical scenarios (e.g. *500 payment failed tickets during launch*, *50% staff emergency leave*) to simulate SLA blast radius, queue delays, and generate a 3-phase tactical mitigation playbook.
- **3-Stage Operational Diagnosis:** Live bottleneck detection &rarr; Root-cause analysis &rarr; 1-Click execution actions.

### 3. 📊 Automated Executive Operations & Performance Reports
- **📅 Daily 7:00 PM IST EOD Report:** Automated email briefing containing ticket volume, resolution rates, pending queues, and an attached line-item CSV spreadsheet.
- **📈 Weekly Monday 9:00 AM IST Executive Report:** 7-day KPI briefing, Agent Workload & Efficiency Leaderboard (🥇🥈🥉), SLA health compliance, and full spreadsheet attachment.
- **Dynamic Admin Targeting:** Delivers reports directly to configured alert mailboxes (`kumbharganesh815@gmail.com`).

### 4. ⚡ Database-Backed Agent Collision Detection
- **Serverless-Safe Presence:** Real-time presence stored in PostgreSQL (`AgentPresence`), syncing seamlessly across different machines, browsers, and serverless containers.
- **Visual Warnings:** Glowing amber collision banner and active viewer badges on ticket detail views and main table lists.

### 5. 🛡️ Multi-Tier Escalation (L1 / L2 / L3) & SLA Breach Automation
- **Multi-Tier Routing:** Seamless ticket handovers across Tier 1, Tier 2, and Tier 3 with mandatory internal handover notes and agent email CC notifications.
- **SLA Breach Monitoring:** Automatic background tracking with instant email escalation alerts sent to administrators.

### 6. 📥 Automated Inbound Email Ingestion & IMAP Sync
- **20-Second Polling Cron:** Automatically ingests inbound customer emails, extracts attachments, creates tickets, and connects follow-up replies into existing threads.
- **Processed Email De-duplication:** Tracks unique `emailMessageId`s to prevent duplicate imports.

### 7. ✨ High-Fidelity Shimmering Skeleton Loaders
- **Zero Layout Shift:** Custom Next.js shimmering skeleton loading states across all routes (`/tickets`, `/tickets/[id]`, `/users`, `/horizon`, `/knowledge`, `/profile`).

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16.3 (Turbopack, App Router)](https://nextjs.org/) |
| **Frontend UI** | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/) |
| **Database & ORM** | [PostgreSQL with pgvector extension](https://www.postgresql.org/), [Prisma ORM 7.9](https://www.prisma.io/) |
| **AI & LLM** | [Google Gemini 3.5 Flash / 3.7 Flash](https://ai.google.dev/) via REST API |
| **Authentication** | Custom JWT authentication with [jose](https://github.com/panva/jose) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Email Service** | [Nodemailer](https://nodemailer.com/) (SMTP) & [ImapFlow](https://imapflow.com/) (IMAP) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📂 Project Structure

```
├── prisma/
│   └── schema.prisma              # PostgreSQL schema with Vector extensions & AgentPresence
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # Login, Logout, Forgot & Reset Password
│   │   │   ├── cron/              # Daily EOD and Weekly Report Crons
│   │   │   ├── horizon/           # Horizon AI Operations & Scenario Simulator
│   │   │   ├── knowledge/         # Knowledge Base CRUD & Search
│   │   │   ├── reports/           # On-demand Daily & Weekly report dispatch
│   │   │   ├── tickets/           # Ticket CRUD, Messages, Presence, Claim, Escalate, SLA
│   │   │   └── users/             # User & Staff Management
│   │   └── dashboard/
│   │       ├── horizon/           # Horizon AI Operations & Sandbox UI
│   │       ├── knowledge/         # Knowledge Base UI
│   │       ├── profile/           # Admin Profile & Report Controls
│   │       ├── tickets/           # Tickets Table & Detail Views
│   │       └── users/             # Staff Directory & Role Management
│   ├── components/                # Reusable UI components & Dashboard Greetings
│   └── lib/
│       ├── aiFirstResponder.ts    # AI First-Responder engine & email dispatch
│       ├── auth.ts                # JWT verification & password hashing
│       ├── dailyReportService.ts  # Daily EOD generator & CSV builder
│       ├── email.ts               # Nodemailer SMTP transporter
│       ├── emailSyncService.ts    # ImapFlow inbound email syncer
│       ├── gemini.ts              # Gemini multi-model fallback & prompt router
│       ├── presenceStore.ts       # Database-backed agent collision store
│       ├── slaService.ts          # SLA breach checker & admin alert dispatcher
│       └── weeklyReportService.ts # Weekly Executive briefing & CSV builder
├── instrumentation.ts             # Server-side background cron schedulers
└── middleware.ts                  # Route guard & JWT verification middleware
```

---

## 🚀 Getting Started Locally

### 1. Clone the Repository
```bash
git clone https://github.com/ganesh-kumbhar01/ticket-management-system.git
cd ticket-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ticket_system?schema=public"
JWT_SECRET="your-secure-jwt-secret"
GEMINI_API_KEY="your-google-gemini-api-key"

# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="465"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Inbound IMAP Sync
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="your-email@gmail.com"
IMAP_PASS="your-app-password"

NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Setup & Migrations
```bash
npx prisma generate
npx prisma db push
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Production Build & Validation

```bash
npm run build
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
