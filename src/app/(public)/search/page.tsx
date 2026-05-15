import { redirect } from 'next/navigation';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach(item => nextParams.append(key, item));
    } else if (value !== undefined) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  redirect(queryString ? `/schools?${queryString}` : '/schools');
}
