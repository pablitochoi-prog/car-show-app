import { prisma } from "@/lib/db";

export async function getSiteAdminUserIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { platformRole: "ADMIN", status: "ACTIVE" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return admins.map((a) => a.id);
}
