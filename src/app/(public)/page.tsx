'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/schools/SearchBar';
import SchoolCard from '@/components/schools/SchoolCard';
import { School } from '@/types';
import { getSchoolTypeLabel } from '@/utils/helpers';
import {
  PaletteIcon, BookOpenIcon, AcademicCapIcon, BuildingLibraryIcon, UserGroupSmallIcon,
  MagnifyingGlassIcon, ScaleIcon, PhoneIcon,
} from '@/components/ui/Icons';

export default function HomePage() {
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    fetch('/api/schools?status=active')
      .then(res => res.json())
      .then(data => setSchools(data.schools || []))
      .catch(() => setSchools([]));
  }, []);

  const featuredSchools = schools.filter(s => s.isFeatured);
  const topRated = [...schools].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const schoolTypeOrder: School['type'][] = ['kindergarten', 'primary', 'secondary', 'university', 'daycare'];
  const schoolTypes = schoolTypeOrder.filter(type => schools.some(s => s.type === type));
  const averageRating = schools.length > 0
    ? (schools.reduce((sum, s) => sum + s.rating, 0) / schools.length).toFixed(1)
    : '0.0';

  const typeIcons = {
    kindergarten: <PaletteIcon className="w-6 h-6 text-primary" />,
    primary: <BookOpenIcon className="w-6 h-6 text-primary" />,
    secondary: <AcademicCapIcon className="w-6 h-6 text-primary" />,
    university: <BuildingLibraryIcon className="w-6 h-6 text-primary" />,
    daycare: <UserGroupSmallIcon className="w-6 h-6 text-primary" />,
  };

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 lg:py-16">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-10 items-center">
            <div>
              <p className="inline-flex items-center text-xs sm:text-sm font-medium uppercase tracking-wider text-text-secondary border border-border rounded-full px-3 py-1 mb-5">
                Trusted by families across Uganda
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-text-primary mb-4">
                Find a school that truly fits your child.
              </h1>
              <p className="text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed mb-8">
                Search verified school profiles, compare fees and facilities, and contact schools directly from one reliable platform.
              </p>

              <SearchBar large className="max-w-3xl" variant="default" />

              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <span className="text-sm text-text-muted">Popular:</span>
                {['Kampala', 'Boarding Schools', 'Primary Schools', 'International'].map(tag => (
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
                {[
                  { value: `${schools.length}+`, label: 'Schools Listed' },
                  { value: '12K+', label: 'Families' },
                  { value: averageRating, label: 'Avg Rating' },
                  { value: '50+', label: 'Cities' },
                ].map(stat => (
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
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=900&fit=crop&q=80"
                  alt="Students in class"
                  className="w-full h-[340px] sm:h-[420px] object-cover"
                />
                <div className="p-4 border-t border-border">
                  <p className="text-sm text-text-secondary">Updated today with new admissions and verified listings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-3xl text-text-primary">Browse by school type</h2>
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

      <section className="bg-surface border-y border-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-7">
            <div>
              <h2 className="text-3xl text-text-primary">Featured schools</h2>
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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-3xl text-text-primary">Top rated this month</h2>
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

      <section className="bg-surface border-y border-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl text-text-primary">How it works</h2>
            <p className="text-text-secondary mt-2">A straightforward process from discovery to contact.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: <MagnifyingGlassIcon className="w-7 h-7 text-primary" />,
                title: 'Search',
                desc: 'Use location, school type, fees, and facilities to narrow your options quickly.',
              },
              {
                icon: <ScaleIcon className="w-7 h-7 text-primary" />,
                title: 'Compare',
                desc: 'Review schools side by side so you can make clear decisions with confidence.',
              },
              {
                icon: <PhoneIcon className="w-7 h-7 text-primary" />,
                title: 'Contact',
                desc: 'Reach schools directly through phone, email, or WhatsApp and plan your visit.',
              },
            ].map((step, i) => (
              <article key={step.title} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span>{step.icon}</span>
                  <span className="text-xs font-semibold text-text-muted">0{i + 1}</span>
                </div>
                <h3 className="text-xl text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="rounded-2xl border border-border bg-primary text-white p-8 sm:p-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl">Run a school? Reach the right families.</h2>
            <p className="text-white/80 mt-2 mb-6">
              Create your listing, keep your profile updated, and receive inquiries from parents actively searching.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/schools/register" className="px-4 py-2.5 rounded-md bg-white text-primary font-medium hover:bg-white/90 transition-colors">
                List Your School
              </Link>
              <Link href="/pricing" className="px-4 py-2.5 rounded-md border border-white/30 text-white font-medium hover:bg-white/10 transition-colors">
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
