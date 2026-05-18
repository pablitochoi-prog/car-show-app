import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listMasterCategoriesForPicker } from "@/lib/master-categories";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await listMasterCategoriesForPicker();

  return NextResponse.json({
    categories: rows.map((c) => ({
      id: c.id,
      name: c.name,
      groupName: c.groupName,
      isSystem: true,
    })),
  });
}
