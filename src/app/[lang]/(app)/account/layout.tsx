import { Header } from "@/components/header/Header";
import { AccountPageContent } from "@/components/account/AccountPageContent";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function AccountLayout({ children, params }: Props) {
  const { lang } = await params;
  return (
    <div className="min-h-screen bg-gray-50">
      <Header lang={lang} />
      <AccountPageContent lang={lang}>{children}</AccountPageContent>
    </div>
  );
}
