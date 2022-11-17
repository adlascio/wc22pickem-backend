import { prisma } from "../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { string, z } from "zod";
import ShortUniqueId from "short-unique-id";
import { authenticate } from "../plugins/authenticate.js";

export async function poolRoutes(server: FastifyInstance) {
  server.get("/pools/count", async () => {
    const count = await prisma.pool.count();
    return { count };
  });

  server.post("/pools", async (request, reply) => {
    const createPoolBody = z.object({
      title: z.string(),
    });
    const { title } = createPoolBody.parse(request.body);

    const generate = new ShortUniqueId({ length: 6 });
    const code = String(generate()).toUpperCase();

    try {
      await request.jwtVerify();

      await prisma.pool.create({
        data: {
          title,
          code,
          ownerId: request.user.sub,

          participants: {
            create: {
              userId: request.user.sub,
            },
          },
        },
      });
    } catch {
      await prisma.pool.create({
        data: {
          title,
          code,
        },
      });
    }

    return reply.status(201).send({ code });
  });

  server.post(
    "/pools/join",
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const joinPoolBody = z.object({
        code: z.string(),
      });

      const { code } = joinPoolBody.parse(request.body);

      const pool = await prisma.pool.findUnique({
        where: {
          code,
        },
        include: {
          participants: {
            where: {
              userId: request.user.sub,
            },
          },
        },
      });

      if (!pool) {
        return reply.status(404).send({ message: "Pool not found" });
      }

      if (pool.participants.length > 0) {
        return reply.status(400).send({ message: "Already joined pool" });
      }

      if (!pool.ownerId) {
        await prisma.pool.update({
          where: {
            id: pool.id,
          },
          data: {
            ownerId: request.user.sub,
          },
        });
      }

      await prisma.participant.create({
        data: {
          userId: request.user.sub,
          poolId: pool.id,
        },
      });

      return reply.status(201).send({ message: "Joined pool" });
    }
  );

  server.get("/pools", { onRequest: [authenticate] }, async (request) => {
    const pools = await prisma.pool.findMany({
      where: {
        participants: {
          some: {
            userId: request.user.sub,
          },
        },
      },
      include: {
        _count: {
          select: {
            participants: true,
          },
        },
        participants: {
          select: {
            id: true,
            user: {
              select: {
                avatarUrl: true,
              },
            },
          },
          take: 4,
        },
        owner: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    return { pools };
  });

  server.get("/pools/:id", { onRequest: [authenticate] }, async (request) => {
    const getPoolsParams = z.object({
      id: z.string(),
    });

    const { id } = getPoolsParams.parse(request.params);

    const pool = await prisma.pool.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            participants: true,
          },
        },
        participants: {
          select: {
            id: true,
            user: {
              select: {
                avatarUrl: true,
                name: true,
              },
            },
          },
          take: 4,
        },
        owner: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    return { pool };
  });

  server.get(
    "/pools/:id/ranking",
    { onRequest: [authenticate] },
    async (request) => {
      const getPoolsParams = z.object({
        id: z.string(),
      });

      const { id } = getPoolsParams.parse(request.params);

      const poolParticipants = await prisma.pool.findUnique({
        where: {
          id,
        },
        include: {
          participants: {
            select: {
              id: true,
              user: true,
              guesses: true,
            },
          },
        },
      });

      const results = await prisma.result.findMany({});
      interface Result {
        id: string;
        firstTeamPoints: number;
        secondTeamPoints: number;
        gameId: string;
      }

      const resultsObj: { [key: string]: Result } = {};
      results.forEach((result) => {
        resultsObj[result.gameId] = result;
      }, {});

      const participants = poolParticipants?.participants.map((participant) => {
        const score = participant.guesses.reduce((acc, guess) => {
          const result = resultsObj[guess.gameId];
          if (result) {
            if (
              result.firstTeamPoints === guess.firstTeamPoints &&
              result.secondTeamPoints === guess.secondTeamPoints
            ) {
              acc += 5;
              return acc;
            }
            if (
              result.firstTeamPoints - result.secondTeamPoints > 0 &&
              guess.firstTeamPoints - guess.secondTeamPoints > 0
            ) {
              acc += 1;
              return acc;
            }
            if (
              result.firstTeamPoints - result.secondTeamPoints < 0 &&
              guess.firstTeamPoints - guess.secondTeamPoints < 0
            ) {
              acc += 1;
              return acc;
            }
            if (
              result.firstTeamPoints - result.secondTeamPoints === 0 &&
              guess.firstTeamPoints - guess.secondTeamPoints === 0
            ) {
              acc += 1;
              return acc;
            }
          }
          return acc;
        }, 0);

        return {
          ...participant,
          score,
        };
      });

      return { participants };
    }
  );
}
