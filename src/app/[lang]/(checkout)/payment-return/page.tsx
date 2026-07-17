import { Suspense } from "react";
import { PaymentReturnContent } from "./PaymentReturnContent";
import { Logo } from "@/components/header/Logo";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function PaymentReturnPage({ params }: Props) {
  const { lang } = await params;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex-none border-b border-gray-100 bg-white">
        <div className="container-shell px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <Logo lang={lang} />
        </div>
      </header>

      <Suspense
        fallback={
          <main className="flex-1 flex items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full border-4 border-brand-primary border-t-transparent animate-spin" />
            </div>
          </main>
        }
      >
        <PaymentReturnContent lang={lang} />
      </Suspense>
    </div>
  );
}
