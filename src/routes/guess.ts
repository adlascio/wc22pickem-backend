import { prisma } from "../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/authenticate.js";
import { z } from "zod";

export async function guessRoutes(server: FastifyInstance) {
  server.get("/guesses/count", async () => {
    const count = await prisma.guess.count();
    return { count };
  });

  server.post(
    "/pools/:poolId/games/:gameId/guesses",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const createGuessParams = z.object({
        poolId: z.string(),
        gameId: z.string(),
      });

      const { poolId, gameId } = createGuessParams.parse(request.params);

      const createGuessBody = z.object({
        firstTeamPoints: z.number(),
        secondTeamPoints: z.number(),
      });

      const { firstTeamPoints, secondTeamPoints } = createGuessBody.parse(
        request.body
      );

      const participant = await prisma.participant.findUnique({
        where: {
          userId_poolId: {
            userId: request.user.sub,
            poolId,
          },
        },
      });

      if (!participant) {
        return reply
          .status(401)
          .send({ message: "Participant not authorized" });
      }

      const guess = await prisma.guess.findUnique({
        where: {
          participantId_gameId: {
            participantId: participant.id,
            gameId,
          },
        },
      });

      if (guess) {
        return reply.status(409).send({ message: "Guess already exists" });
      }

      const game = await prisma.game.findUnique({
        where: {
          id: gameId,
        },
      });

      if (!game) {
        return reply.status(404).send({ message: "Game not found" });
      }

      if (game.date < new Date()) {
        return reply.status(400).send({ message: "Game already started" });
      }

      await prisma.guess.create({
        data: {
          firstTeamPoints,
          secondTeamPoints,
          participantId: participant.id,
          gameId,
        },
      });

      return reply.status(201).send({ message: "Guess created" });
    }
  );
}
