import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/core/auth";

export default async function Home() {
  const ctx = await getAuthContext();
  redirect(ctx ? "/dashboard" : "/login");
}
