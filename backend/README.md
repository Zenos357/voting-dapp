# Online Voting & Election System - Backend Architecture & Documentation

This document explains the complete backend architecture, technology stack, database schema, and API structure of the Online Voting System. It is written to help developers, interviewers, and team members understand how the backend operates.

---

## 🛠️ 1. Technology Stack

The backend is built using a modern, scalable, and secure Node.js stack:

- **Runtime & Framework**: Node.js with Express.js
- **Language**: TypeScript (for strong typing, interface definitions, and better developer experience)
- **Database**: MongoDB (NoSQL) accessed via Mongoose ODM.
  - *Note*: We use `mongodb-memory-server` as a local fallback for seamless development without requiring a local MongoDB installation.
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs (for password hashing)
- **Real-Time Communication**: Socket.io (Used for real-time election monitoring and alerts)
- **API Documentation**: Swagger UI (`swagger-ui-express` & `yamljs`) using OpenAPI 3.0 specs.
- **Validation**: Zod (for strict runtime schema validation of incoming API payloads)
- **Security & Performance**: 
  - `helmet` (HTTP headers security)
  - `cors` (Cross-Origin Resource Sharing)
  - `express-rate-limit` (to prevent brute-force and DDoS attacks)
- **File Uploads**: `multer` (for handling candidate profile pictures and election assets)

---

## 📂 2. Folder Structure (MVC Pattern)

The project follows a clean **Model-View-Controller (MVC)** architecture (adapted for APIs):

```text
server/
├── src/
│   ├── config/        # Environment variables, MongoDB connection, Socket.io setup
│   ├── controllers/   # Core business logic for handling requests (AuthController, ElectionController, etc.)
│   ├── database/      # Database seeding scripts (seed.ts) to generate mock data
│   ├── middleware/    # Custom middlewares (auth, role-checking, error-handling, rate-limiting)
│   ├── models/        # Mongoose Database Schemas (User, Election, VoteBallot, etc.)
│   ├── routes/        # Express router definitions mapping URLs to Controllers
│   ├── services/      # Reusable business services (if logic gets too heavy for controllers)
│   ├── utils/         # Helper functions (password generators, crypto utilities)
│   ├── validators/    # Zod validation schemas for request bodies
│   ├── app.ts         # Express app initialization & middleware configuration
│   ├── server.ts      # Main entry point (HTTP server startup & DB connection)
│   └── swagger.yml    # OpenAPI specification for Swagger UI
├── .env               # Environment configuration secrets
├── package.json       # Project dependencies & npm scripts
└── tsconfig.json      # TypeScript compiler configuration
```

---

## 🗄️ 3. Database Structure (MongoDB Collections)

We use a normalized NoSQL approach with the following primary collections:

1. **User (`users`)**: Stores all system users including Admins, Election Officers, and standard Voters. Includes `email`, hashed `password`, and references a `Role`.
2. **Role (`roles`)**: Defines RBAC (Role-Based Access Control) permissions (e.g., `SUPER_ADMIN`, `VOTER`).
3. **Election (`elections`)**: Represents an election event (e.g., "Student Council 2026"). Contains start/end dates, status (`UPCOMING`, `ACTIVE`, `COMPLETED`), and rules.
4. **ElectionPosition (`election_positions`)**: The specific seats being contested within an election (e.g., "President", "Secretary").
5. **Candidate (`candidates`)**: Represents users running for a specific `ElectionPosition`. Stores their symbol, manifesto, and photo.
6. **ElectionVoter (`election_voters`)**: Mapping table that defines which voters are eligible to vote in which specific elections.
7. **VoteBallot (`vote_ballots`)**: The actual **cryptographically separated** vote. It records who won the vote for a position, but is intentionally disconnected from the voter's identity to ensure the **Secret Ballot** principle.
8. **VoteParticipation (`vote_participations`)**: A ledger that records *that* a user voted (to prevent double-voting), without recording *who* they voted for.
9. **IdempotencyKey (`idempotency_keys`)**: Prevents duplicate API submissions (e.g., double-clicking the "Cast Vote" button).
10. **AuditLog (`audit_logs`)**: Immutable ledger recording sensitive admin actions for compliance.

---

## 🌐 4. API Architecture & Flow

The API routes are prefixed with `/api/v1` and are RESTful.

### Request Flow
1. **Client Request** → `express-rate-limit` (Checks if IP is spamming).
2. **Security Headers** → `helmet` & `cors` validate origin.
3. **Authentication** → `authenticate.ts` middleware verifies the JWT token.
4. **Authorization** → `authorizeRole(['ADMIN'])` middleware checks if the user has permission.
5. **Validation** → `validate(schema)` uses Zod to ensure the request body is perfect.
6. **Controller** → Executes business logic, talks to MongoDB.
7. **Response** → Standardized JSON response (or passes to `errorHandler.ts` on failure).

### Key Features Explained for Interviews:

#### A. How is Double-Voting Prevented?
When a vote is cast:
1. We check the `VoteParticipation` collection. If the user's ID exists for this election, we throw a `403 Forbidden`.
2. We use an `Idempotency-Key` header. If a network delay causes the client to send the same request twice, the backend catches the duplicate key in the `IdempotencyKey` collection and ignores the second request.
3. Both the ballot creation and participation logging happen inside a **MongoDB Transaction** (ACID compliant). If one fails, everything rolls back.

#### B. How is Voter Privacy Maintained?
We decouple the "Who voted?" from "Who did they vote for?". 
The `VoteParticipation` collection records that `User_A` voted. The `VoteBallot` collection records that `Candidate_B` got a vote. There is no foreign key linking `VoteBallot` to `User_A`.

#### C. Real-Time Analytics
When an admin views the dashboard, Socket.io pushes live vote count updates whenever a new `VoteBallot` is successfully saved, allowing the dashboard to update without refreshing the page.

---

## 🚀 5. How to Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (automatically seeds the database):
   ```bash
   npm run dev
   # OR for Windows avoiding NPM path bugs:
   .\node_modules\.bin\tsx src\server.ts
   ```
3. View API Documentation (Swagger):
   Navigate to `http://localhost:5000/api-docs`

---
*Document designed for GitHub README & technical handovers.*
