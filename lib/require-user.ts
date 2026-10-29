import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { connection } from "next/server";

export const requireUser = cache(async () => {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      createdAt: true,
      password: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) redirect("/sign-in");
  return user;
});
