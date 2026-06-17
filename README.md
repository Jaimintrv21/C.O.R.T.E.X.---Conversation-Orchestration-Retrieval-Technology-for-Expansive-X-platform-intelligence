# C.O.R.T.E.X.

**Conversation Orchestration & Retrieval Technology for Expansive X-platform intelligence**

> *Your AI conversations. Your knowledge. Your control.*

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

C.O.R.T.E.X. is an open-source, self-hostable platform that unifies AI conversation history from ChatGPT, Claude, Gemini, and more into a searchable, analyzable knowledge base — with **local-first privacy by default** and a stunning, high-performance "Liquid Glass" UI.

---

## 🌟 Key Features & Functionality

### 1. The Liquid Glass Design System
C.O.R.T.E.X. features a premium, hyper-modern interface:
- **WebGL Shader Backgrounds**: Fluid, dynamic animated backgrounds providing a rich aesthetic depth.
- **Liquid Glass Shell**: Highly translucent containers (`backdrop-blur-3xl`, `bg-white/[0.05]`) with micro-borders mimicking thick physical glass.
- **Pill-Shaped Architecture**: Zero sharp corners. Every button, input, and container is fully rounded for a fluid experience.
- **Responsive Floating Dock**: A dynamically scaling, hover-to-expand sidebar that preserves screen real estate while maximizing accessibility.

### 2. Universal Knowledge Indexing
- **Multi-Platform Sync**: Consolidate chats from OpenAI, Anthropic, Google, and Perplexity into one unified feed.
- **Semantic Search**: Fast, vector-based searching (⌘K) to instantly find that one code snippet or idea you had 3 months ago.

### 3. Local-First AI Integration (Ollama)
Privacy is a core pillar. Connect C.O.R.T.E.X. to your local `Ollama` instance to index, search, and chat with your data using completely local, open-source models (like Llama 3) without sending a single byte to the cloud.

### 4. Advanced Tooling & Artifact Generation
- **Artifact Generator**: Turn raw chat histories into structured outputs (Websites, Dashboards, Reports, Mind Maps) using our animated multi-step wizard.
- **Analytics & Knowledge Graph**: Visualize the relationships between your ideas, code snippets, and daily topics. 
- **Compare Mode**: Analyze model outputs side-by-side to determine which provider gives the best results for specific prompts.

### 5. Enterprise-Grade Dashboard Shell
- **Real-Time Notifications**: Animated, color-coded notification system for sync updates and system alerts.
- **Workspace Settings**: Invite team members, manage roles (Owner/Editor), configure cloud data sync, and manage API integrations.
- **User Profiles**: Manage timezone settings, avatars, and basic personal information.

---

## 📚 Documentation Reference

For deep-dives into the architecture, planning, and specifications, refer to our comprehensive documentation folder:

👉 **[View the `/docs` Folder](./docs/)**

### Quick Links to Key Documents
- [Product Requirements Document (PRD)](./docs/planning/PRD.md)
- [System Architecture Overview](./docs/architecture/overview.md)
- [Project Roadmap](./docs/planning/roadmap.md)
- [Database Schema & ERD](./docs/planning/erd.md)
- [Threat Model & Security](./docs/planning/threat-model.md)
- [Folder Structure Reference](./docs/architecture/folder-structure.md)

---

## 🚀 Tech Stack

### Frontend Architecture
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (with custom Glassmorphism utilities)
- **Components**: Radix UI primitives, `class-variance-authority`
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend & Infrastructure (Planned/Integrating)
- **API**: FastAPI + Celery
- **Database**: PostgreSQL 16 + pgvector
- **Search**: Meilisearch
- **Cache**: Redis 7
- **AI Router**: LiteLLM (Cloud) / Ollama (Local)

---

## 🛠️ Getting Started

To run the C.O.R.T.E.X. dashboard UI locally:

```bash
# 1. Clone the repository
git clone https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence.git
cd C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence

# 2. Setup Environment Variables
cp .env.example .env

# 3. Install Dependencies
cd apps/web
npm install

# 4. Start the Development Server
npm run dev
```

Visit `http://localhost:3000/dashboard` to experience the Liquid Glass interface.

---

## 🔒 Privacy & Data Control
C.O.R.T.E.X. allows you to entirely disable cloud syncing and force all processing through Local AI processing. Anonymous telemetry can be toggled via the settings page.

## License
Apache 2.0 — See [LICENSE](LICENSE)
