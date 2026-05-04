// frontend/src/app/(app)/news/[date]/page.tsx
import NewsBriefingDetail from "@/components/news/NewsBriefingDetail";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function NewsByDatePage({ params }: Props) {
  const { date } = await params;
  return <NewsBriefingDetail initialDate={date} />;
}
