import { redirect } from "next/navigation";

interface PageParams {
  params: { token: string };
}

export default function LegacySharePage({ params }: PageParams) {
  redirect(`/${params.token}-fileshared`);
}
