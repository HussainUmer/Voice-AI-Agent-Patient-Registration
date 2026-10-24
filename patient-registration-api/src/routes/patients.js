
const express = require("express");
const { z } = require("zod");
const prisma = require("../prisma");
const { patientSchema } = require("../validation");

const router = express.Router();

const respond = (res, status, data = null, error = null) =>
  res.status(status).json({ data, error });

router.get("/", async (req, res, next) => {
  try {
    const where = { deleted_at: null };

    if (req.query.last_name)
      where.last_name = {
        equals: req.query.last_name,
        mode: "insensitive"
      };

    if (req.query.phone_number)
      where.phone_number = req.query.phone_number.replace(/\D/g, "");

    if (req.query.date_of_birth) {
      const parsed = patientSchema.shape.date_of_birth.safeParse(
        req.query.date_of_birth
      );

      if (!parsed.success)
        return respond(res, 400, null, "Invalid date of birth");

      where.date_of_birth = parsed.data;
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { created_at: "desc" }
    });

    respond(res, 200, patients);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!z.uuid().safeParse(req.params.id).success)
      return respond(res, 400, null, "Invalid UUID");

    const patient = await prisma.patient.findFirst({
      where: { patient_id: req.params.id, deleted_at: null }
    });

    if (!patient)
      return respond(res, 404, null, "Patient not found");

    respond(res, 200, patient);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = patientSchema.safeParse(req.body);

    if (!parsed.success)
      return respond(res, 422, null, z.flattenError(parsed.error));

    const patient = await prisma.patient.create({
      data: parsed.data
    });

    respond(res, 201, patient);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!z.uuid().safeParse(req.params.id).success)
      return respond(res, 400, null, "Invalid UUID");

    const parsed = patientSchema.partial().safeParse(req.body);

    if (!parsed.success)
      return respond(res, 422, null, z.flattenError(parsed.error));

    const existing = await prisma.patient.findFirst({
      where: { patient_id: req.params.id, deleted_at: null }
    });

    if (!existing)
      return respond(res, 404, null, "Patient not found");

    const patient = await prisma.patient.update({
      where: { patient_id: req.params.id },
      data: parsed.data
    });

    respond(res, 200, patient);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!z.uuid().safeParse(req.params.id).success)
      return respond(res, 400, null, "Invalid UUID");

    const existing = await prisma.patient.findFirst({
      where: { patient_id: req.params.id, deleted_at: null }
    });

    if (!existing)
      return respond(res, 404, null, "Patient not found");

    const patient = await prisma.patient.update({
      where: { patient_id: req.params.id },
      data: { deleted_at: new Date() }
    });

    respond(res, 200, patient);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
