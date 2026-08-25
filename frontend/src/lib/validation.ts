import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  // bcrypt silently truncates beyond 72 bytes — cap here so the stored hash
  // actually covers the whole password the user typed.
  password: z.string().min(8).max(72),
});
