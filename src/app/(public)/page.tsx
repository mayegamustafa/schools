'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/schools/SearchBar';
import SchoolCard from '@/components/schools/SchoolCard';
import { School } from '@/types';
import { getSchoolTypeLabel } from '@/utils/helpers';
import { useSiteContent } from '@/context/SiteContentContext';
import {
  PaletteIcon, BookOpenIcon, AcademicCapIcon, BuildingLibraryIcon, UserGroupSmallIcon,
  MagnifyingGlassIcon, ScaleIcon, PhoneIcon,
} from '@/components/ui/Icons';

export default function HomePage() {
  const [schools, setSchools] = useState<School[]>([]);
  const sc = useSiteContent();

  useEffect(() => {
    fetch('/api/schools?status=active')
      .then(res => res.json())
      .then(data => setSchools(data.schools || []))
      .catch(() => setSchools([]));
  }, []);

  const featuredSchools = schools.filter(s => s.isFeatured);
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
  } as Record<string, ReturnType<typeof UserGroupSmallIcon>>;

  const statsRow = [
    { value: `${schools.length}+`, label: sc.stats.schoolsLabel },
    { value: sc.stats.familiesValue, label: sc.stats.familiesLabel },
    { value: averageRating, label: sc.stats.ratingLabel },
    { value: sc.stats.citiesValue, label: sc.stats.citiesLabel },
  ];

  const stepIcons = [
    <MagnifyingGlassIcon key="search" className="w-7 h-7 text-primary" />,
    <ScaleIcon key="compare" className="w-7 h-7 text-primary" />,
    <PhoneIcon key="contact" className="w-7 h-7 text-primary" />,
  ];

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 lg:py-16">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-10 items-center">
            <div>
              {sc.hero.badge && (
                <p className="inline-flex items-center text-xs sm:text-sm font-medium uppercase tracking-wider text-text-secondary border border-border rounded-full px-3 py-1 mb-5">
                  {sc.hero.badge}
                </p>
              )}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-text-primary mb-4">
                {sc.hero.title}
              </h1>
              <p className="text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed mb-8">
                {sc.hero.description}
              </p>

              <SearchBar large className="max-w-3xl" variant="default" />

              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <span className="text-sm text-text-muted">Popular:</span>
                {sc.hero.popularTags.map(tag => (
                  <Link
                    key={tag}
                    href={`/schools?q=${encodeURIComponent(tag)}`}
                    className="text-sm text-text-secondary border border-border rounded-full px-3 py-1.5 hover:bg-hover transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border">
                {statsRow.map(stat => (
                  <div key={stat.label}>
                    <p className="text-xl sm:text-2xl font-semibold text-text-primary">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-border overflow-hidden bg-surface shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sc.hero.imageUrl}
                  alt={sc.hero.imageCaption || 'School hero image'}
                  className="w-full h-[200px] sm:h-[300px] lg:h-[420px] object-cover"
                />
                <div className="p-4 border-t border-border">
                  <p className="text-sm text-text-secondary">{sc.hero.imageCaption}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by type */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-2xl sm:text-3xl text-text-primary">Browse by school type</h2>
            <p className="text-text-secondary mt-1">Start with the level you are looking for.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {schoolTypes.map(type => {
            const count = schools.filter(s => s.type === type).length;
            return (
              <Link
                key={type}
                href={`/schools?type=${type}`}
                className="group bg-surface rounded-xl border border-border p-4 hover:bg-card transition-colors"
              >
                <div className="mb-3">{typeIcons[type]}</div>
                <h3 className="text-sm font-semibold text-text-primary">{getSchoolTypeLabel(type)}</h3>
                <p className="text-xs text-text-muted mt-0.5">{count} schools</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured schools */}
      <section className="bg-surface border-y border-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-7">
            <div>
              <h2 className="text-2xl sm:text-3xl text-text-primary">Featured schools</h2>
              <p className="text-text-secondary mt-1">Verified schools selected for quality and consistency.</p>
            </div>
            <Link href="/schools?featured=true" className="hidden sm:inline-flex text-sm text-text-secondary hover:text-text-primary">
              View all featured
            </Link>
          </div>

          {featuredSchools.length === 0 ? (
            <p className="text-sm text-text-secondary">No featured schools available yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredSchools.map(school => (
                <SchoolCard key={school.id} school={school} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Top rated */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-2xl sm:text-3xl text-text-primary">Top rated this month</h2>
            <p className="text-text-secondary mt-1">Based on recent parent reviews.</p>
          </div>
          <Link href="/schools?sort=rating" className="hidden sm:inline-flex text-sm text-text-secondary hover:text-text-primary">
            Browse all ratings
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {topRated.map(school => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface border-y border-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl text-text-primary">{sc.howItWorks.title}</h2>
            <p className="text-text-secondary mt-2">{sc.howItWorks.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {sc.howItWorks.steps.map((step, i) => (
              <article key={step.title} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span>{stepIcons[i] ?? stepIcons[0]}</span>
                  <span className="text-xs font-semibold text-text-muted">0{i + 1}</span>
                </div>
                <h3 className="text-xl text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="rounded-2xl border border-border bg-primary text-white p-8 sm:p-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl">{sc.cta.title}</h2>
            <p className="text-white/80 mt-2 mb-6">{sc.cta.description}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={sc.cta.primaryHref} className="px-4 py-2.5 rounded-md bg-white text-primary font-medium hover:bg-white/90 transition-colors">
                {sc.cta.primaryLabel}
              </Link>
              <Link href={sc.cta.secondaryHref} className="px-4 py-2.5 rounded-md border border-white/30 text-white font-medium hover:bg-white/10 transition-colors">
                {sc.cta.secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
