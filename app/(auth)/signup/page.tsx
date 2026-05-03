import AuthForm from '@/components/AuthForm';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  return <AuthForm defaultMode="register" forcedRole={role as any} />;
}
