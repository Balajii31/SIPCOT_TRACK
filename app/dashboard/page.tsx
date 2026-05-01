import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Since authentication is bypassed and we are acting as an admin,
  // simply redirect to the admin dashboard.
  redirect('/dashboard/admin');
}
