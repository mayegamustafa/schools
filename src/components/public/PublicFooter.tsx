import Link from 'next/link';

export default function PublicFooter() {
  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-text-primary">Get updates on new school listings</h3>
              <p className="text-sm text-text-secondary mt-1">No spam. Just useful admission windows and newly verified schools.</p>
            </div>
            <div className="flex flex-wrap w-full md:w-auto gap-2.5">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 min-w-[180px] md:w-72 px-4 py-2.5 text-sm bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <button className="w-full sm:w-auto px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors btn-press shrink-0">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-text-primary tracking-tight">SchoolFinder</span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
              A practical platform for families to discover, compare, and connect with schools across Uganda.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Discover</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Browse Schools', href: '/schools' },
                { label: 'Search', href: '/search' },
                { label: 'Compare Schools', href: '/compare' },
                { label: 'Top Rated', href: '/schools?sort=rating' },
              ].map(item => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">For Schools</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'List Your School', href: '/schools/register' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map(item => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5">
              {['About', 'Contact', 'Privacy', 'Terms'].map(item => (
                <li key={item}>
                  <Link href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm text-text-muted">
            &copy; {new Date().getFullYear()} SchoolFinder. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link href="#" className="text-sm text-text-muted hover:text-text-secondary transition-colors">Privacy</Link>
            <Link href="#" className="text-sm text-text-muted hover:text-text-secondary transition-colors">Terms</Link>
            <Link href="#" className="text-sm text-text-muted hover:text-text-secondary transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
