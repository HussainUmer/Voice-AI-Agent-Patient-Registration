
const { z } = require("zod");

const name = z.string().trim()
  .min(1).max(50)
  .regex(/^[a-zA-Z'-]+$/);

const phone = z.string()
  .transform(v => v.replace(/\D/g, ""))
  .refine(v => v.length === 10, "Must be 10 digits");

const dob = z.string().transform((value, ctx) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  if (!match) {
    ctx.addIssue({
      code: "custom",
      message: "Use MM/DD/YYYY"
    });
    return z.NEVER;
  }

  const [, mm, dd, yyyy] = match;
  const date = new Date(Date.UTC(+yyyy, +mm - 1, +dd));

  if (
    date.getUTCFullYear() !== +yyyy ||
    date.getUTCMonth() !== +mm - 1 ||
    date.getUTCDate() !== +dd ||
    date > new Date()
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Invalid date of birth"
    });
    return z.NEVER;
  }

  return date;
});

const patientSchema = z.object({
  first_name: name,
  last_name: name,
  date_of_birth: dob,
  sex: z.enum(["Male", "Female", "Other", "Decline to Answer"]),
  phone_number: phone,
  email: z.email().optional().nullable(),
  address_line_1: z.string().trim().min(1),
  address_line_2: z.string().optional().nullable(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().toUpperCase().length(2),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  insurance_provider: z.string().optional().nullable(),
  insurance_member_id: z.string().optional().nullable(),
  preferred_language: z.string().default("English"),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: phone.optional().nullable()
});

module.exports = { patientSchema };
