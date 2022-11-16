import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";

export async function userRoutes(server: FastifyInstance) {
  server.get("/users/count", async () => {
    const count = await prisma.user.count();
    return { count };
  });
}
