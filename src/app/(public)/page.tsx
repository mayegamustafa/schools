'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/schools/SearchBar';
import SchoolCard from '@/components/schools/SchoolCard';
import Reveal from '@/components/public/Reveal';
import { School } from '@/types';
import { getSchoolTypeLabel } from '@/utils/helpers';
import { useSiteContent } from '@/context/SiteContentContext';
import {
  PaletteIcon, BookOpenIcon, AcademicCapIcon, BuildingLibraryIcon, UserGroupSmallIcon,
  MagnifyingGlassIcon, ScaleIcon, PhoneIcon, ShieldCheckIcon, StarIcon, ChatBubbleIcon,
  CursorClickIcon,
} from '@/components/ui/Icons';

export default function HomePage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const sc = useSiteContent();

  useEffect(() => {
    fetch('/api/schools?status=active')
      .then(res => res.json())
      .then(data => setSchools(data.schools || []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));

    fetch('/downloads/version.json', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(v => v?.version && setAppVersion(v.version))
      .catch(() => {});
  }, []);

  const featuredSchools = schools.filter(s => s.isFeatured).slice(0, 6);
  const topRated = [...schools].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const schoolTypeOrder: School['type'][] = ['daycare', 'kindergarten', 'primary', 'secondary', 'tertiary', 'university'];
  const schoolTypes = schoolTypeOrder.filter(type => schools.some(s => s.type === type));
  const averageRating = schools.length > 0
    ? (schools.reduce((sum, s) => sum + s.rating, 0) / schools.length).toFixed(1)
    : '0.0';

  const typeIcons = {
    daycare: <UserGroupSmallIcon className="w-6 h-6 text-primary" />,
    kindergarten: <PaletteIcon className="w-6 h-6 text-primary" />,
    primary: <BookOpenIcon className="w-6 h-6 text-primary" />,
    secondary: <AcademicCapIcon className="w-6 h-6 text-primary" />,
    tertiary: <BuildingLibraryIcon className="w-6 h-6 text-primary" />,
    university: <BuildingLibraryIcon className="w-6 h-6 text-primary" />,
  } as Record<string, React.ReactNode>;

  const statsRow = [
    { value: `${schools.length}+`, label: sc.stats.schoolsLabel },
    { value: sc.stats.familiesValue, label: sc.stats.familiesLabel },
    { value: averageRating, label: sc.stats.ratingLabel },
    { value: sc.stats.citiesValue, label: sc.stats.citiesLabel },
  ];

  const stepIcons = [
    <MagnifyingGlassIcon key="search" className="w-6 h-6 text-primary" />,
    <ScaleIcon key="compare" className="w-6 h-6 text-primary" />,
    <PhoneIcon key="contact" className="w-6 h-6 text-primary" />,
  ];

  const valueProps = [
    { icon: <ShieldCheckIcon className="w-6 h-6 text-primary" />, title: 'Verified profiles', desc: 'Every listed school is reviewed so you can trust what you see — fees, facilities, and contact details.' },
    { icon: <ScaleIcon className="w-6 h-6 text-primary" />, title: 'Compare side by side', desc: 'Line up to four schools and weigh fees, ratings, and programs in one clear view.' },
    { icon: <StarIcon className="w-6 h-6 text-primary" />, title: 'Real parent reviews', desc: 'Honest ratings and stories from families who have walked the same path you are on.' },
    { icon: <ChatBubbleIcon className="w-6 h-6 text-primary" />, title: 'Message directly', desc: 'Reach admissions teams in a tap — no queues, no runarounds, all in one inbox.' },
  ];

  const marqueeNames = (featuredSchools.length ? featuredSchools : schools).slice(0, 8).map(s => s.name);

  return (
    <div className="bg-background overflow-x-hidden">
      {/* ===================== HERO ===================== */}
      <section className="relative mesh-bg border-b border-border overflow-hidden">
        <div className="absolute inset-0 grid-lines pointer-events-none" aria-hidden="true" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl animate-float-slow pointer-events-none" aria-hidden="true" />
        <div className="absolute top-40 -left-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-float pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-24">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-10 lg:gap-12 items-center">
            <div>
              <Reveal as="div" className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary bg-surface/70 border border-border rounded-full pl-1.5 pr-3 py-1.5 mb-6 backdrop-blur">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
                </span>
                {sc.hero.badge || 'Trusted by families choosing the right school'}
              </Reveal>

              <Reveal as="h1" delay={60} className="text-4xl sm:text-5xl lg:text-[3.75rem] leading-[1.05] text-text-primary mb-5">
                {sc.hero.title.split(' ').slice(0, -1).join(' ')}{' '}
                <span className="text-gradient">{sc.hero.title.split(' ').slice(-1)}</span>
              </Reveal>

              <Reveal as="p" delay={120} className="text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed mb-8">
                {sc.hero.description}
              </Reveal>

              <Reveal delay={180}>
                <SearchBar large className="max-w-3xl shadow-lg rounded-2xl" variant="hero" />
              </Reveal>

              <Reveal delay={240} className="flex flex-wrap items-center gap-2.5 mt-5">
                <span className="text-sm text-text-muted">Popular:</span>
                {sc.hero.popularTags.map(tag => (
                  <Link
                    key={tag}
                    href={`/schools?q=${encodeURIComponent(tag)}`}
                    className="text-sm text-text-secondary bg-surface/60 border border-border rounded-full px-3 py-1.5 hover:bg-surface hover:border-primary/40 hover:text-text-primary transition-all"
                  >
                    {tag}
                  </Link>
                ))}
              </Reveal>

              <Reveal delay={300} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-9 pt-7 border-t border-border/70">
                {statsRow.map(stat => (
                  <div key={stat.label}>
                    <p className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </Reveal>
            </div>

            {/* Floating image card */}
            <Reveal variant="scale" delay={160} className="relative">
              <div className="absolute -inset-3 bg-gradient-to-tr from-accent/20 via-transparent to-primary/15 rounded-[28px] blur-xl" aria-hidden="true" />
              <div className="relative rounded-3xl border border-border overflow-hidden bg-surface shadow-xl lift">
                <div className="relative shine-host">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sc.hero.imageUrl}
                    alt={sc.hero.imageCaption || 'Students at school'}
                    className="w-full h-[260px] sm:h-[360px] lg:h-[440px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/55 via-transparent to-transparent" />

                  {/* Rating chip */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-surface/90 backdrop-blur rounded-full pl-2.5 pr-3.5 py-1.5 shadow-md">
                    <StarIcon className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold text-text-primary">{averageRating}</span>
                    <span className="text-xs text-text-muted">avg rating</span>
                  </div>

                  {/* Verified chip */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 bg-surface/90 backdrop-blur rounded-2xl px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
                        <ShieldCheckIcon className="w-5 h-5 text-success" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">Verified schools</p>
                        <p className="text-xs text-text-muted truncate">{sc.hero.imageCaption || 'Reviewed for accuracy'}</p>
                      </div>
                    </div>
                    <Link href="/schools" className="shrink-0 text-xs font-semibold text-primary hover:underline">Explore →</Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Trust marquee */}
        {marqueeNames.length > 0 && (
          <div className="relative border-t border-border/70 bg-surface/40 py-4 marquee-mask">
            <div className="marquee-track gap-10">
              {[...marqueeNames, ...marqueeNames].map((name, i) => (
                <span key={i} className="flex items-center gap-2.5 text-sm text-text-muted whitespace-nowrap">
                  <BuildingLibraryIcon className="w-4 h-4 text-text-muted/70" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===================== BROWSE BY TYPE ===================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Explore</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-text-primary">Browse by school type</h2>
            <p className="text-text-secondary mt-2">Start with the level you are looking for.</p>
          </div>
          <Link href="/schools" className="hidden sm:inline-flex text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            View all schools →
          </Link>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {(schoolTypes.length ? schoolTypes : schoolTypeOrder).map((type, i) => {
            const count = schools.filter(s => s.type === type).length;
            return (
              <Reveal key={type} delay={i * 60}>
                <Link
                  href={`/schools?type=${type}`}
                  className="group block gradient-border p-5 lift h-full"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    {typeIcons[type]}
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">{getSchoolTypeLabel(type)}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{count} {count === 1 ? 'school' : 'schools'}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===================== VALUE PROPS ===================== */}
      <section className="bg-surface border-y border-border py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Why SchoolFinder</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-text-primary">Everything you need to choose with confidence</h2>
            <p className="text-text-secondary mt-3">From first search to final decision, we keep the whole journey simple, transparent, and in one place.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {valueProps.map((vp, i) => (
              <Reveal key={vp.title} delay={i * 80}>
                <div className="bg-card border border-border rounded-2xl p-6 h-full lift">
                  <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
                    {vp.icon}
                  </div>
                  <h3 className="text-lg text-text-primary mb-2">{vp.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{vp.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FEATURED ===================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Handpicked</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-text-primary">Featured schools</h2>
            <p className="text-text-secondary mt-2">Verified schools selected for quality and consistency.</p>
          </div>
          <Link href="/schools?featured=true" className="hidden sm:inline-flex text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            View all featured →
          </Link>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => <div key={i} className="skeleton h-80 rounded-2xl" />)}
          </div>
        ) : featuredSchools.length === 0 ? (
          <p className="text-sm text-text-secondary">No featured schools available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredSchools.map((school, i) => (
              <Reveal key={school.id} delay={i * 70}>
                <SchoolCard school={school} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ===================== STATS BAND ===================== */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div className="absolute inset-0 opacity-30 animate-gradient pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(at 20% 30%, rgba(139,115,85,0.6) 0, transparent 45%), radial-gradient(at 80% 70%, rgba(93,133,112,0.45) 0, transparent 45%)' }}
          aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {statsRow.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80} className="text-center">
                <p className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{stat.value}</p>
                <p className="text-sm text-white/70 mt-1.5">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== TOP RATED ===================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Loved by parents</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-text-primary">Top rated this month</h2>
            <p className="text-text-secondary mt-2">Based on recent parent reviews.</p>
          </div>
          <Link href="/schools?sort=rating" className="hidden sm:inline-flex text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            Browse all ratings →
          </Link>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-80 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {topRated.map((school, i) => (
              <Reveal key={school.id} delay={i * 70}>
                <SchoolCard school={school} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="bg-surface border-y border-border py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Simple steps</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-text-primary">{sc.howItWorks.title}</h2>
            <p className="text-text-secondary mt-3">{sc.howItWorks.subtitle}</p>
          </Reveal>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* connecting line */}
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />
            {sc.howItWorks.steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 100} className="relative">
                <div className="bg-card border border-border rounded-2xl p-7 h-full lift text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-5">
                    <span className="relative w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-sm">
                      {stepIcons[i] ?? stepIcons[0]}
                    </span>
                    <span className="text-4xl font-semibold text-border select-none">0{i + 1}</span>
                  </div>
                  <h3 className="text-xl text-text-primary mb-2">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== APP INSTALL ===================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary-dark text-white px-6 sm:px-12 py-12 sm:py-14">
            <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-float-slow pointer-events-none" aria-hidden="true" />
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-medium bg-white/10 border border-white/15 rounded-full px-3 py-1.5 mb-5">
                  <CursorClickIcon className="w-4 h-4" /> Available on Android
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3">Take SchoolFinder anywhere</h2>
                <p className="text-white/75 max-w-md mb-7 leading-relaxed">
                  Search schools, compare options, save favourites, and message admissions teams — right from your phone. Install the app directly, no store account needed.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="/api/app/download"
                    className="inline-flex items-center gap-2.5 bg-white text-primary font-semibold rounded-xl px-5 py-3 hover:bg-white/90 transition-colors btn-press"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2a1 1 0 0 1 1 1v10.59l3.3-3.3a1 1 0 0 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V3a1 1 0 0 1 1-1Z"/>
                      <path d="M4 19a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z"/>
                    </svg>
                    Download the app
                  </a>
                  <Link href="/schools" className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors px-2">
                    Browse on web instead →
                  </Link>
                </div>
                <p className="text-xs text-white/55 mt-4">
                  Direct APK install · No Play Store needed{appVersion ? ` · v${appVersion}` : ''}
                </p>
              </div>

              {/* Phone mockup */}
              <div className="relative justify-self-center lg:justify-self-end">
                <div className="relative w-56 h-[420px] rounded-[2.5rem] border-[6px] border-white/15 bg-primary-dark/60 backdrop-blur shadow-2xl animate-float overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-white/15 rounded-b-2xl" />
                  <div className="p-4 pt-9 space-y-3">
                    <div className="h-9 rounded-xl bg-white/12" />
                    <div className="h-24 rounded-xl bg-white/10" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-20 rounded-xl bg-white/10" />
                      <div className="h-20 rounded-xl bg-white/10" />
                    </div>
                    <div className="h-20 rounded-xl bg-white/10" />
                    <div className="h-9 rounded-xl bg-accent/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Reveal>
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-text-primary">{sc.cta.title}</h2>
            <p className="text-text-secondary mt-3 mb-7 max-w-xl mx-auto">{sc.cta.description}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={sc.cta.primaryHref} className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors btn-press">
                {sc.cta.primaryLabel}
              </Link>
              <Link href={sc.cta.secondaryHref} className="px-6 py-3 rounded-xl border border-border text-text-primary font-semibold hover:bg-hover transition-colors">
                {sc.cta.secondaryLabel}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
