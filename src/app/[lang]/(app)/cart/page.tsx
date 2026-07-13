import { Header } from "@/components/header/Header";
import { B2BCartContent } from "@/components/cart/B2BCartContent";

type Props = {
  params: Promise<{ lang: string }>;
};

export const metadata = { title: "Cart" };

export default async function CartPage({ params }: Props) {
  const { lang } = await params;
  return (
    <div className="min-h-screen bg-white">
      <Header lang={lang} />
      <B2BCartContent lang={lang} />
    </div>
  );
}
