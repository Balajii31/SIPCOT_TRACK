import AuthForm from '@/components/AuthForm';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const forcedRole = (role === 'industry' || role === 'official' || role === 'admin') ? role : undefined;

  return <AuthForm defaultMode="register" forcedRole={forcedRole} />;
}
