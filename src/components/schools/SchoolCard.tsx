'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { School } from '@/types';
import { FALLBACK_LOGO_IMAGE, formatCurrency, getSchoolGenderLabel, getSchoolTypeColor, getSchoolTypeLabel, sanitizeImageSrc } from '@/utils/helpers';

interface SchoolCardProps {
  school: School;
  layout?: 'grid' | 'list';
}

function categoryLabel(category: School['category']) {
  if (category === 'day') return 'Day School';
  if (category === 'boarding') return 'Boarding School';
  return 'Day and Boarding';
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
      <article className="bg-surface border border-border rounded-xl overflow-hidden card-hover flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-80 h-52 sm:h-auto shrink-0 img-zoom">
          <Image
            src={safeCoverImage}
            alt={school.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 320px"
          />
          {school.isFeatured && (
            <span className="absolute top-3 left-3 bg-primary text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
              Featured
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(school.id);
            }}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute top-3 right-3 w-9 h-9 bg-surface border border-border rounded-full flex items-center justify-center hover:bg-hover transition-colors"
          >
            <svg
              className={`w-4 h-4 ${isFavorited ? 'text-error fill-error' : 'text-text-muted'}`}
              fill={isFavorited ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
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
              <p className="text-sm text-text-secondary mt-1">{school.location.city}, {school.location.region}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-text-primary">{school.rating.toFixed(1)}</p>
              <p className="text-xs text-text-muted">{school.reviewCount} reviews</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary line-clamp-2 mb-4">{school.shortDescription}</p>

          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSchoolTypeColor(school.type)}`}>
              {getSchoolTypeLabel(school.type)}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-hover text-text-secondary">
              {categoryLabel(school.category)}
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
                className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                  isComparing
                    ? 'bg-primary/10 border-primary/25 text-primary'
                    : 'border-border text-text-secondary hover:bg-hover'
                }`}
              >
                {isComparing ? 'Comparing' : 'Compare'}
              </button>
              <Link
                href={`/schools/${school.id}`}
                className="px-3.5 py-2 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-dark transition-colors"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-surface border border-border rounded-xl overflow-hidden card-hover">
      <div className="relative h-52 img-zoom">
        <Image
          src={safeCoverImage}
          alt={school.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {school.isFeatured && (
          <span className="absolute top-3 left-3 bg-primary text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
            Featured
          </span>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(school.id);
          }}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute top-3 right-3 w-9 h-9 bg-surface border border-border rounded-full flex items-center justify-center hover:bg-hover transition-colors"
        >
          <svg
            className={`w-4 h-4 ${isFavorited ? 'text-error fill-error' : 'text-text-muted'}`}
            fill={isFavorited ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-card overflow-hidden shrink-0 relative border border-border">
            <Image src={safeLogoImage} alt={`${school.name} logo`} fill className="object-cover" sizes="40px" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/schools/${school.id}`} className="text-base font-semibold text-text-primary hover:text-primary transition-colors truncate">
                {school.name}
              </Link>
              {school.isVerified && (
                <span className="text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Verified</span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{school.location.city}, {school.location.region}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-text-primary">{school.rating.toFixed(1)}</p>
            <p className="text-xs text-text-muted">{school.reviewCount}</p>
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

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <p className="text-xs text-text-muted">Lower Section</p>
            <p className="text-base font-semibold text-text-primary">
              {hasDayFees ? formatCurrency(lowerSectionPreview) : 'Fees on request'}
            </p>
          </div>
          <Link
            href={`/schools/${school.id}`}
            className="px-3.5 py-2 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-dark transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
