import { redirect } from "next/navigation";
import Image from "next/image";
import { submitPassword } from "./actions";
import { PasswordInput } from "./PasswordInput";
import { Button } from "@/components/ui/Button/Button";
import { getTenantConfig } from "@/lib/tenant-config";

type Props = {
  searchParams: Promise<{ from?: string; error?: string }>;
};

export const metadata = { title: "Password Protected" };

export default async function GatePage({ searchParams }: Props) {
  const { theme, security } = await getTenantConfig();
  if (!security.gatekeeperPassword) {
    redirect("/");
  }

  const { from = "/", error } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand mark */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/icon.png" alt="Logo" width={56} height={56} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            This site is password protected
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the password to continue
          </p>
        </div>

        <form
          action={submitPassword}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4"
        >
          <input type="hidden" name="from" value={from} />

          <PasswordInput
            brandColor={theme.brandPrimary.replace(/^#/, "")}
            error={error ? "Incorrect password. Please try again." : undefined}
          />

          <Button type="submit" fullWidth>
            Enter site
          </Button>
        </form>
      </div>
    </div>
  );
}
