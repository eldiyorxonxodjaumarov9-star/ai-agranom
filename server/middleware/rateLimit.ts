import rateLimit from "express-rate-limit";

export const agronomRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Juda ko'p so'rov yuborildi. Iltimos, 15 daqiqadan keyin qayta urinib ko'ring.",
  },
});
