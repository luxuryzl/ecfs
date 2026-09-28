import "dotenv/config";
import { buildApp } from "./app.js";

const app = await buildApp();

const port = Number(process.env.PORT) || 3000;

try {
  await app.listen({ port, host: "localhost" });
  console.log(`Server is running at http://localhost:${port}`);
} catch (err) {
  console.error("Error starting server:", err);
  process.exit(1);
}
