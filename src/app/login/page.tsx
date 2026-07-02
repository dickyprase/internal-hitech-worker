import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  return (
    <div className='flex min-h-svh items-center justify-center bg-muted p-6 md:p-10'>
      <div className='w-full max-w-sm'>
        <LoginForm />
      </div>
    </div>
  );
}
