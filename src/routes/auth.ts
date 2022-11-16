import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import fetch from "node-fetch";
import { authenticate } from "../plugins/authenticate";

export async function authRoutes(server: FastifyInstance) {
  server.get("/me", { onRequest: [authenticate] }, async (request) => {
    return { user: request.user };
  });
  server.post("/users", async (request) => {
    console.log("post /users");
    const createUserBody = z.object({
      access_token: z.string(),
    });

    const { access_token } = createUserBody.parse(request.body);

    try {
      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      const userData = await userResponse.json();

      const userInfoSchema = z.object({
        sub: z.string(),
        email: z.string(),
        name: z.string(),
        picture: z.string(),
      });

      const userInfo = userInfoSchema.parse(userData);

      let user = await prisma.user.findUnique({
        where: {
          googleId: userInfo.sub,
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            avatarUrl: userInfo.picture,
          },
        });
      }

      const token = server.jwt.sign(
        { name: user.name, avatarUrl: user.avatarUrl, email: user.email },
        {
          sub: user.id,
          expiresIn: "7 days",
        }
      );

      return { token };
    } catch (error) {
      console.log(error);
      return { error: "Something went wrong" };
    }
  });
}
