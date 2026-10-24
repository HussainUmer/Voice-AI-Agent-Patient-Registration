# Voice AI Patient Registration System

A voice-based patient registration prototype that collects demographic details through a conversational AI assistant, confirms them with the caller, and stores validated records in PostgreSQL. A REST API supports patient management.

> **Demo only:** Use fictional patient data. This prototype is not certified for handling real patient health information.

## Tech Stack

- **Voice & telephony:** Vapi
- **Backend:** Node.js, Express
- **Validation:** Zod
- **Database:** Neon PostgreSQL, Prisma ORM
- **Deployment:** Render

## How It Works

```mermaid
flowchart LR
    A[Caller] --> B[Vapi Assistant]
    B --> C[Collect & confirm details]
    C --> D[save_patient tool]
    D --> E[Express webhook]
    E --> F[Zod validation]
    F --> G[(Neon PostgreSQL)]
    G --> E
    E --> B
```

The assistant gathers required details, offers optional fields, and reads the information back. **Only after explicit caller confirmation** does it invoke `save_patient`. The backend authenticates the webhook, validates the payload, and returns a result that the assistant uses to confirm success or explain failure.

## Features

- Conversational registration with clarification and correction support
- Required demographics: name, date of birth, sex, phone, and US address
- Optional email, insurance, language, and emergency contact details
- Validation of submitted fields and confirmation before saving
- Patient UUIDs, timestamps, and soft deletion
- REST endpoints for listing, searching, creating, updating, and deleting records
- Shared-secret authentication for the Vapi webhook

## Local Setup

**Prerequisites:** Node.js, npm, and a Neon PostgreSQL database.

```bash
git clone <REPOSITORY_URL>
cd <PROJECT_DIRECTORY>
npm install
cp .env.example .env
```

Set the following values in `.env` (on Windows, copy the file manually or use `Copy-Item .env.example .env`):

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
VAPI_WEBHOOK_SECRET="your-random-shared-secret"
PORT=3000
NODE_ENV=development
```

Initialize the database and start the API:

```bash
npx prisma db push
npx prisma generate
npm start
```

Check `http://localhost:3000/health`. Keep `.env` out of version control.

## REST API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/patients` | List/search active patients |
| GET | `/patients/:id` | Retrieve a patient |
| POST | `/patients` | Register a patient |
| PUT | `/patients/:id` | Update supplied fields |
| DELETE | `/patients/:id` | Soft-delete a patient |
| POST | `/vapi/tool` | Receive authenticated Vapi tool calls |

`GET /patients` supports `last_name`, `date_of_birth`, and `phone_number` query filters. Invalid patient input returns HTTP `422`; successful creation returns HTTP `201`.

**Example request:**

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "date_of_birth": "04/20/1995",
  "sex": "Female",
  "phone_number": "2125550147",
  "address_line_1": "100 Example Avenue",
  "city": "New York",
  "state": "NY",
  "zip_code": "10001"
}
```

Send this JSON to `POST /patients` with `Content-Type: application/json`.

## Vapi Configuration

1. Create an assistant instructed to collect, validate, read back, and explicitly confirm patient information **before** saving.
2. Create a synchronous **Function** tool named `save_patient` with parameters matching the patient fields above (and optional fields, if used).
3. Set its server URL to `https://<RENDER_SERVICE>.onrender.com/vapi/tool`.
4. Configure the outgoing `x-vapi-secret` header with the same raw value as `VAPI_WEBHOOK_SECRET` (no `Bearer` prefix).
5. Attach the tool to the assistant and assign the assistant to your Vapi US phone number.

The webhook expects Vapi's `message.toolCallList` structure and returns results associated with each `toolCallId`.

## Deployment & Demo

Deploy the GitHub repository as a Render Web Service. If `package.json` is in a subfolder, set Render's **Root Directory** accordingly.

- **Build:** `npm ci && npx prisma generate`
- **Start:** `npm start`
- **Environment:** `DATABASE_URL`, `VAPI_WEBHOOK_SECRET`, `NODE_ENV=production`

**Live API:** `https://<RENDER_SERVICE>.onrender.com`  
**US demo number:** `<VAPI_PHONE_NUMBER>`  
**Repository:** `<REPOSITORY_URL>`

## Verification & Limitations

- **Verified:** Neon schema setup, REST create/list operations, and a locally simulated authenticated Vapi webhook saving a patient.
- **Deployed:** Express backend on Render.
- **Pending:** Successful end-to-end phone registration. The latest Vapi test reported a **20-second tool-call webhook timeout**.
- **Prototype limitations:** Render free-tier cold starts may cause timeouts; API endpoints are not protected for production patient data. Full US state-code membership validation should also be added or verified.

Use fictional data only. Do not expose credentials or submit real patient information to this demo.
