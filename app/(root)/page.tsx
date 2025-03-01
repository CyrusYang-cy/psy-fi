import { redirect } from "next/navigation";

export default async function Home() {
  // Redirect to mood-meter page
  redirect("/mood-meter");
}
