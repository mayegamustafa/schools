'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { School } from '@/types';
import { FALLBACK_LOGO_IMAGE, formatCurrency, getSchoolCategoryLabel, getSchoolGenderLabel, getSchoolTypeColor, getSchoolTypeLabel, sanitizeImageSrc } from '@/utils/helpers';

interface SchoolCardProps {
  school: School;
  layout?: 'grid' | 'list';
}

function HeartButton({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      className="absolute top-3 right-3 w-9 h-9 bg-surface/90 backdrop-blur border border-border rounded-full flex items-center justify-center hover:bg-surface hover:scale-105 transition-all shadow-sm"
    >
      <svg
        className={`w-4 h-4 transition-colors ${active ? 'text-error fill-error' : 'text-text-muted'}`}
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-text-primary">
      <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M9.05 2.927c.3-.921 1.6-.921 1.9 0l1.286 3.957a1 1 0 0 0 .95.69h4.16c.97 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 0 0-.363 1.118l1.286 3.957c.3.921-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 0 0-1.176 0l-3.366 2.446c-.783.57-1.838-.197-1.538-1.118l1.285-3.957a1 1 0 0 0-.362-1.118L2.354 9.391c-.783-.57-.38-1.81.588-1.81h4.161a1 1 0 0 0 .95-.69L9.05 2.927Z" />
      </svg>
      {value.toFixed(1)}
    </span>
  );
}

export default function SchoolCard({ school, layout = 'grid' }: SchoolCardProps) {
  const { favorites, toggleFavorite, addToCompare, compareList, showToast } = useApp();

  const isFavorited = favorites.includes(school.id);
  const isComparing = compareList.includes(school.id);
  const hasDayFees = school.fees.dayMin > 0 || school.fees.dayMax > 0;
  const lowerSectionPreview = school.fees.dayMin > 0 ? school.fees.dayMin : school.fees.dayMax;
  const safeCoverImage = sanitizeImageSrc(school.coverImage);
  const safeLogoImage = sanitizeImageSrc(school.logo, FALLBACK_LOGO_IMAGE);

  const handleCompare = () => {
    if (isComparing) {
      showToast('Already in compare list', 'info');
      return;
    }
    if (compareList.length >= 4) {
      showToast('You can compare up to 4 schools', 'error');
      return;
    }
    addToCompare(school.id);
    showToast('Added to compare', 'success');
  };

  if (layout === 'list') {
    return (
      <article className="bg-surface border border-border rounded-2xl overflow-hidden lift flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-80 h-52 sm:h-auto shrink-0 overflow-hidden">
          <Image
            src={safeCoverImage}
            alt={school.name}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes="(max-width: 640px) 100vw, 320px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/30 to-transparent" />
          {school.isFeatured && (
            <span className="absolute top-3 left-3 bg-primary text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
              Featured
            </span>
          )}
          <HeartButton active={isFavorited} onClick={(e) => { e.preventDefault(); toggleFavorite(school.id); }} />
        </div>

        <div className="flex-1 p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/schools/${school.id}`} className="text-lg font-semibold text-text-primary hover:text-primary transition-colors">
                  {school.name}
                </Link>
                {school.isVerified && (
                  <span className="text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Verified</span>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {school.location.city}, {school.location.region}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <Rating value={school.rating} />
              <p className="text-xs text-text-muted mt-0.5">{school.reviewCount} reviews</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary line-clamp-2 mb-4">{school.shortDescription}</p>

          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSchoolTypeColor(school.type)}`}>
              {getSchoolTypeLabel(school.type)}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-hover text-text-secondary">
              {getSchoolCategoryLabel(school.category)}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary/10 text-secondary">
              {getSchoolGenderLabel(school.gender)}
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-xs text-text-muted">Lower Section</p>
              <p className="text-base font-semibold text-text-primary">
                {hasDayFees ? `${formatCurrency(lowerSectionPreview)} / term` : 'Fees on request'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCompare}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  isComparing ? 'bg-primary/10 border-primary/25 text-primary' : 'border-border text-text-secondary hover:bg-hover'
                }`}
              >
                {isComparing ? 'Comparing' : 'Compare'}
              </button>
              <Link href={`/schools/${school.id}`} className="px-3.5 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                View Details
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-surface border border-border rounded-2xl overflow-hidden lift h-full flex flex-col">
      <div className="relative h-52 overflow-hidden">
        <Image
          src={safeCoverImage}
          alt={school.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/55 via-primary-dark/5 to-transparent" />

        {school.isFeatured && (
          <span className="absolute top-3 left-3 bg-primary text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Featured
          </span>
        )}
        <HeartButton active={isFavorited} onClick={(e) => { e.preventDefault(); toggleFavorite(school.id); }} />

        {/* Overlaid rating + location */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-white">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {school.location.city}
          </span>
          <span className="inline-flex items-center gap-1 bg-surface/90 backdrop-blur rounded-full px-2 py-0.5 shadow-sm">
            <Rating value={school.rating} />
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-card overflow-hidden shrink-0 relative border border-border -mt-9 z-10 shadow-md bg-surface">
            <Image src={safeLogoImage} alt={`${school.name} logo`} fill className="object-cover" sizes="40px" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/schools/${school.id}`} className="text-base font-semibold text-text-primary hover:text-primary transition-colors truncate">
                {school.name}
              </Link>
              {school.isVerified && (
                <span className="text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full shrink-0">Verified</span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{school.reviewCount} reviews</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSchoolTypeColor(school.type)}`}>
            {getSchoolTypeLabel(school.type)}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-hover text-text-secondary">
            {school.category === 'day' ? 'Day' : school.category === 'boarding' ? 'Boarding' : 'Mixed'}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary/10 text-secondary">
            {getSchoolGenderLabel(school.gender)}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
          <div>
            <p className="text-xs text-text-muted">Lower Section</p>
            <p className="text-base font-semibold text-text-primary">
              {hasDayFees ? formatCurrency(lowerSectionPreview) : 'Fees on request'}
            </p>
          </div>
          <Link
            href={`/schools/${school.id}`}
            className="px-3.5 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors group-hover:shadow-md"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
