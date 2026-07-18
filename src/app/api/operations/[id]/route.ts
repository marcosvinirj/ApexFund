import { NextResponse } from "next/server";
import { deleteOperation } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await deleteOperation(user.id, id);
  return NextResponse.json({ ok: true });
}
