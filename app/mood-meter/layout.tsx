import { getLoggedInUser } from "@/lib/actions/user.actions";
import Sidebar from "@/components/Sidebar";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getLoggedInUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-row">
      <Sidebar user={user} />
      <section className="flex-1">{children}</section>
    </main>
  );
}
