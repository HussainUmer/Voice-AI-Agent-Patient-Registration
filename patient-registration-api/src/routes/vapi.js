
const express = require("express");
const crypto = require("crypto");
const prisma = require("../prisma");
const { patientSchema } = require("../validation");

const router = express.Router();

// Short-lived in-memory protection against repeated tool calls.
// This is not persistent across server restarts.
const processedCalls = new Map();

function authenticate(req, res, next) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  const provided = req.get("x-vapi-secret");

  if (!secret || !provided) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const a = Buffer.from(secret);
  const b = Buffer.from(provided);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

router.post("/tool", authenticate, async (req, res) => {
  const calls = req.body?.message?.toolCallList;

  if (!Array.isArray(calls) || calls.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const results = [];

  for (const call of calls) {
    const toolCallId = call.id;

    try {
      if (call.function?.name !== "save_patient") {
        results.push({
          toolCallId,
          error: "Unknown tool"
        });
        continue;
      }

      // Return the previous result if this tool call
      // was already processed by this server instance.
      if (processedCalls.has(toolCallId)) {
        results.push(processedCalls.get(toolCallId));
        continue;
      }

      let args = call.function.arguments;

      if (typeof args === "string") {
        args = JSON.parse(args);
      }

      const parsed = patientSchema.safeParse(args);

      if (!parsed.success) {
        const errors = parsed.error.issues.map(issue =>
          `${issue.path.join(".")}: ${issue.message}`
        );

        results.push({
          toolCallId,
          error: `Validation failed. Ask the caller to correct these fields: ${errors.join("; ")}`
        });

        continue;
      }

      const patient = await prisma.patient.create({
        data: parsed.data
      });

      // Log identifiers only; avoid logging patient PII.
      console.log("Patient registered", {
        patient_id: patient.patient_id,
        toolCallId,
        callId: req.body?.message?.call?.id
          || req.body?.call?.id
      });

      const response = {
        toolCallId,
        result: JSON.stringify({
          success: true,
          patient_id: patient.patient_id,
          message: "Registration saved successfully"
        })
      };

      processedCalls.set(toolCallId, response);
      results.push(response);

    } catch (error) {
      console.error("Vapi registration error:", error);

      results.push({
        toolCallId,
        error: "Database error. Registration was not confirmed. Please inform the caller and do not claim success."
      });
    }
  }

  res.status(200).json({ results });
});

module.exports = router;
