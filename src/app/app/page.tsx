import { redirect } from "next/navigation";
import { getWorkspaceData } from "@/lib/data";
import { Workspace } from "@/components/Workspace";

export default async function AppPage() {
  const data = await getWorkspaceData();

  if (!data) redirect("/login");

  if (!data.profile?.approved) {
    redirect("/login");
  }

  return (
    <Workspace
      profile={data.profile}
      initialChats={data.chats}
      initialMemories={data.memories}
      initialPreferences={data.preferences}
    />
  );
}
