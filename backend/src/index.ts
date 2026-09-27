import { buildApp } from "./app.js";

const app = buildApp();

app.listen({ port: 3000, host: "localhost" }, function (err, address) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});
