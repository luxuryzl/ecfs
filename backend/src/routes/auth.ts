import type { FastifyInstance } from "fastify";

export default async function authRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    return { message: "Hello from auth route!" };
  });
}
