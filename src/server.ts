import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import { poolRoutes } from "./routes/pool";
import { gameRoutes } from "./routes/game";
import { guessRoutes } from "./routes/guess";
import { userRoutes } from "./routes/user";
import { authRoutes } from "./routes/auth";

async function bootstrap() {
  const server = Fastify({ logger: true });

  const date = new Date();
  console.log("date", date.toISOString());

  await server.register(cors, {
    origin: true,
  });

  await server.register(jwt, {
    secret: "supersecret",
  });

  await server.register(poolRoutes);
  await server.register(userRoutes);
  await server.register(guessRoutes);
  await server.register(authRoutes);
  await server.register(gameRoutes);

  await server.listen({ port: 3333, host: "0.0.0.0" });
}

bootstrap();
