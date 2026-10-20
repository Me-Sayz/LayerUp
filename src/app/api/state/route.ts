import { connection } from "next/server";
import { getState } from "@/lib/bus";

export async function GET(): Promise<Response> {
  await connection();
  return Response.json(getState(), {
    headers: { "Cache-Control": "no-store" },
  });
}