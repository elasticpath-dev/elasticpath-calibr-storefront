import { PointManagementTab } from "@/components/account/tabs/PointManagementTab";

type Props = { params: Promise<{ lang: string }> };

export default async function PointManagementPage({ params }: Props) {
  const { lang } = await params;
  return <PointManagementTab lang={lang} />;
}
