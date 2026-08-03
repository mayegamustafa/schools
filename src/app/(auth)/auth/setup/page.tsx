import type { Metadata } from 'next';
import AdminSetupForm from './AdminSetupForm';

export const metadata: Metadata = {
  title: 'Admin setup',
  // Never index a page that can mint admin credentials.
  robots: { index: false, follow: false, nocache: true },
};

// Always resolved fresh — whether setup is available depends on live database
// state and the environment, neither of which can be baked in at build time.
export const dynamic = 'force-dynamic';

export default function AdminSetupPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6l7-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.8 1.8L15 10" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Administrator setup</h1>
          <p className="text-text-secondary mt-2">
            Create the first administrator, or restore access to an existing one.
          </p>
        </div>

        <AdminSetupForm />
      </div>
    </div>
  );
}
