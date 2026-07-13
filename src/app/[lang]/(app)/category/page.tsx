import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function CategoryIndexPage({ params }: Props) {
  const { lang } = await params;
  redirect(`/${lang}/search`);
}
