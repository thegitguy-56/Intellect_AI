import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { SettingsForm } from "@/components/SettingsForm";
import { SignOutButton } from "@/components/SignOutButton";

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: { name: true, email: true },
  });

  return (
    <AppShell>
      <div className="p-margin-desktop">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold text-on-background">Settings</h1>
          <p className="mt-2 text-on-surface-variant">
            Manage your account preferences and notifications.
          </p>
        </header>
        <SettingsForm name={user.name ?? ""} email={user.email} />
        <div className="mt-8 max-w-4xl">
          <SignOutButton />
        </div>
      </div>
    </AppShell>
  );
}
