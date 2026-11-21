import { CartProvider } from "@/context/CartContext";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { Logo } from "@/components/header/Logo";

type Props = {
  params: Promise<{ lang: string; cartId: string }>;
};

/**
 * Checkout for a specific cart (/checkout/<cartId>). The nested CartProvider
 * pins this subtree to that cart without changing the shopper's active cart,
 * so navigating away (logo, header cart, etc.) shows their normal cart.
 */
export default async function CheckoutCartPage({ params }: Props) {
  const { lang, cartId } = await params;
  return (
    <CartProvider fixedCartId={cartId}>
      <CheckoutFlow lang={lang} logo={<Logo lang={lang} />} />
    </CartProvider>
  );
}
