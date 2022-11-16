import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/authenticate";
import { z } from "zod";
import { getName } from "../helpers/country";

export async function gameRoutes(server: FastifyInstance) {
  server.get(
    "/pools/:id/games",
    { onRequest: [authenticate] },
    async (request) => {
      const getPoolsParams = z.object({
        id: z.string(),
      });

      const { id } = getPoolsParams.parse(request.params);

      const games = await prisma.game.findMany({
        orderBy: {
          date: "desc",
        },
        include: {
          guesses: {
            where: {
              participant: {
                userId: request.user.sub,
                poolId: id,
              },
            },
          },
        },
      });

      return {
        games: games.map((game) => ({
          ...game,
          guess: game.guesses.length > 0 ? game.guesses[0] : null,
          guesses: undefined,
          firstTeamCountryName: getName(game.firstTeamCountryCode),
          secondTeamCountryName: getName(game.secondTeamCountryCode),
        })),
      };
    }
  );
}
