import Fastify from "fastify";
import cors from "@fastify/cors";
import authRoutes from "./routes/auth.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, { origin: true });
  app.register(authRoutes);

  return app;
}
