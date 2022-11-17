import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import { poolRoutes } from "./routes/pool.js";
import { gameRoutes } from "./routes/game.js";
import { guessRoutes } from "./routes/guess.js";
import { userRoutes } from "./routes/user.js";
import { authRoutes } from "./routes/auth.js";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const server = Fastify({ logger: true });

  await server.register(cors, {
    origin: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET as string,
  });

  await server.register(poolRoutes);
  await server.register(userRoutes);
  await server.register(guessRoutes);
  await server.register(authRoutes);
  await server.register(gameRoutes);

  await server.listen({ port: PORT as number, host: "0.0.0.0" });
}

bootstrap();
