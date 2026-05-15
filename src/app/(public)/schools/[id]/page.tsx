'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { School, Review } from '@/types';
import { StarRating } from '@/components/ui/StarRating';
import { FALLBACK_LOGO_IMAGE, formatCurrency, getSchoolTypeLabel, getSchoolCategoryLabel, getSchoolGenderLabel, getSchoolTypeColor, formatDate, sanitizeImageSrc } from '@/utils/helpers';
import {
  TruckIcon, BookOpenIcon, BeakerIcon, ComputerDesktopIcon, TrophyIcon,
  WaterIcon, HomeIcon, ForkKnifeIcon, PaletteIcon, MusicalNoteIcon,
  PuzzleIcon, HeartPulseIcon, WifiIcon, ShieldCheckIcon, SunIcon,
} from '@/components/ui/Icons';

export default function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { favorites, toggleFavorite, addToCompare, showToast, token, user } = useApp();
  const [school, setSchool] = useState<School | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'reviews' | 'fees'>('overview');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [subject, setSubject] = useState('Admission inquiry');
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/api/schools/${id}`)
      .then(async res => {
        if (!res.ok) return null;
        const data = await res.json();
        return data.school as School;
      })
      .then(async schoolData => {
        if (!active) return;
        if (!schoolData) {
          setSchool(null);
          setReviews([]);
          return;
        }
        setSchool(schoolData);
        const reviewRes = await fetch(`/api/reviews?schoolId=${schoolData.id}`);
        const reviewData = await reviewRes.json();
        if (active) setReviews(reviewData.reviews || []);
      })
      .catch(() => {
        if (active) {
          setSchool(null);
          setReviews([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!school || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationError('');
      },
      () => {
        setLocationError('Enable location services to get routes from your current position.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [school]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-text-secondary">Loading school details...</div>;
  }

  if (!school) return notFound();

  const isFavorited = favorites.includes(school.id);
  const hasSchoolCoords = Number.isFinite(school.location.latitude)
    && Number.isFinite(school.location.longitude)
    && (school.location.latitude !== 0 || school.location.longitude !== 0);
  const destination = `${school.location.latitude},${school.location.longitude}`;
  const origin = userLocation ? `${userLocation.latitude},${userLocation.longitude}` : '';
  const mapEmbedUrl = hasSchoolCoords
    ? userLocation
      ? `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&output=embed`
      : `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=15&output=embed`
    : '';
  const mapsPlaceLink = hasSchoolCoords
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`
    : '';
  const mapsRouteLink = hasSchoolCoords && userLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
    : '';
  const safeCoverImage = sanitizeImageSrc(school.coverImage);
  const safeLogoImage = sanitizeImageSrc(school.logo, FALLBACK_LOGO_IMAGE);
  const safeGallery = school.gallery.length > 0
    ? school.gallery.map(img => sanitizeImageSrc(img, safeCoverImage))
    : [safeCoverImage];
  const safeVideos = school.videos.map(video => video.trim()).filter(Boolean);
  const safeGalleryIndex = Math.min(galleryIndex, safeGallery.length - 1);

  const startConversation = async () => {
    if (!token || !school || !subject.trim() || !message.trim()) return;

    setSendingMessage(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId: school.id,
          subject,
          message,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Unable to send message');
      setMessage('');
      showToast('Message sent to school', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const facilityIcons: Record<string, React.ReactNode> = {
    Transport: <TruckIcon className="w-5 h-5" />, Library: <BookOpenIcon className="w-5 h-5" />,
    'Science Labs': <BeakerIcon className="w-5 h-5" />, 'Computer Lab': <ComputerDesktopIcon className="w-5 h-5" />,
    'Sports Field': <TrophyIcon className="w-5 h-5" />, 'Swimming Pool': <WaterIcon className="w-5 h-5" />,
    Dormitory: <HomeIcon className="w-5 h-5" />, Cafeteria: <ForkKnifeIcon className="w-5 h-5" />,
    'Art Studio': <PaletteIcon className="w-5 h-5" />, 'Music Room': <MusicalNoteIcon className="w-5 h-5" />,
    Playground: <PuzzleIcon className="w-5 h-5" />, 'Medical Center': <HeartPulseIcon className="w-5 h-5" />,
    WiFi: <WifiIcon className="w-5 h-5" />, Security: <ShieldCheckIcon className="w-5 h-5" />,
    'Chapel/Mosque': <SunIcon className="w-5 h-5" />,
  };

  return (
    <div>
      {/* Cover Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 bg-gray-200">
        <Image src={safeCoverImage} alt={school.name} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl p-1 shadow-lg shrink-0">
                  <div className="relative w-full h-full rounded-xl overflow-hidden">
                    <Image src={safeLogoImage} alt={`${school.name} logo`} fill className="object-cover" sizes="80px" />
                  </div>
                </div>
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold">{school.name}</h1>
                    {school.isVerified && (
                      <svg className="w-6 h-6 text-success-light" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-white/80 text-sm flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {school.location.address}, {school.location.city}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(school.id)}
                  className={`p-3 rounded-xl transition-colors border ${isFavorited ? 'bg-surface text-error border-border' : 'bg-black/20 text-white hover:bg-black/30 border-white/30'}`}
                >
                  <svg className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => { addToCompare(school.id); showToast('Added to compare list', 'success'); }}
                  className="p-3 bg-black/20 text-white rounded-xl hover:bg-black/30 transition-colors border border-white/30"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Info Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8 -mt-2">
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${getSchoolTypeColor(school.type)}`}>
            {getSchoolTypeLabel(school.type)}
          </span>
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600">
            {getSchoolCategoryLabel(school.category)}
          </span>
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-secondary/10 text-secondary">
            {getSchoolGenderLabel(school.gender)}
          </span>
          {school.isPremium && (
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-accent/10 text-accent">
              Premium
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <StarRating rating={school.rating} size="md" />
            <span className="text-lg font-bold text-text-primary">{school.rating}</span>
            <span className="text-sm text-text-muted">({school.reviewCount} reviews)</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-8 overflow-x-auto">
          {(['overview', 'gallery', 'fees', 'reviews'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'reviews' && ` (${reviews.length})`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {activeTab === 'overview' && (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-4">About</h2>
                  <p className="text-text-secondary leading-relaxed">{school.description}</p>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-4">Facilities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {school.facilities.map(f => (
                      <div key={f} className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-border">
                        <span className="text-primary shrink-0">{facilityIcons[f] || <ShieldCheckIcon className="w-5 h-5" />}</span>
                        <span className="text-sm text-text-primary font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Map placeholder */}
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-4">Location</h2>
                  {hasSchoolCoords ? (
                    <div className="bg-white rounded-2xl border border-border overflow-hidden">
                      <iframe
                        title={`Map route to ${school.name}`}
                        src={mapEmbedUrl}
                        className="w-full h-72 sm:h-80 border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                      <div className="p-4 sm:p-5 border-t border-border space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-text-muted">Address</p>
                          <p className="text-sm font-medium text-text-primary">{school.location.address}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-text-muted">Coordinates</p>
                          <p className="text-sm text-text-secondary">
                            {school.location.latitude.toFixed(4)}, {school.location.longitude.toFixed(4)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={mapsPlaceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 text-sm font-medium border border-border rounded-lg text-text-primary hover:bg-gray-50 transition-colors"
                          >
                            Open in Google Maps
                          </a>
                          {mapsRouteLink && (
                            <a
                              href={mapsRouteLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                            >
                              Route from your location
                            </a>
                          )}
                          {school.contact.website && (
                            <a
                              href={school.contact.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 text-sm font-medium border border-border rounded-lg text-text-primary hover:bg-gray-50 transition-colors"
                            >
                              School Website
                            </a>
                          )}
                        </div>
                        {locationError && (
                          <p className="text-xs text-text-muted">{locationError}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center border border-border">
                      <div className="text-center px-5">
                        <svg className="w-12 h-12 text-text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm text-text-muted">Location coordinates are not available for this school yet.</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'gallery' && (
              <div className="space-y-8">
                <div>
                  <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden mb-4">
                    <Image src={safeGallery[safeGalleryIndex]} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {safeGallery.map((img, i) => (
                      <button key={i} onClick={() => setGalleryIndex(i)}
                        className={`relative h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                          i === safeGalleryIndex ? 'border-primary' : 'border-transparent hover:border-gray-300'
                        }`}>
                        <Image src={img} alt="" fill className="object-cover" sizes="150px" />
                      </button>
                    ))}
                  </div>
                </div>

                {safeVideos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h2 className="text-xl font-semibold text-text-primary">Videos</h2>
                      <span className="text-sm text-text-secondary">{safeVideos.length} available</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {safeVideos.map((videoUrl, index) => (
                        <video
                          key={`${videoUrl}-${index}`}
                          src={videoUrl}
                          controls
                          preload="metadata"
                          className="w-full rounded-2xl border border-border bg-black"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="bg-white rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-6">Fee Structure</h2>
                {(school.fees.dayMin > 0 || school.fees.dayMax > 0 || (school.fees.boardingMin || 0) > 0) ? (
                  <>
                    <div className="space-y-4">
                      {(school.fees.dayMin > 0) && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Lower Section Fees</p>
                            <p className="text-xs text-text-muted">Per term</p>
                          </div>
                          <p className="text-lg font-bold text-text-primary">
                            {formatCurrency(school.fees.dayMin)}
                          </p>
                        </div>
                      )}
                      {(school.fees.dayMax > 0) && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Upper Section Fees</p>
                            <p className="text-xs text-text-muted">Per term</p>
                          </div>
                          <p className="text-lg font-bold text-text-primary">
                            {formatCurrency(school.fees.dayMax)}
                          </p>
                        </div>
                      )}
                      {(school.fees.boardingMin || 0) > 0 && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Boarding Fees</p>
                            <p className="text-xs text-text-muted">Per term</p>
                          </div>
                          <p className="text-lg font-bold text-text-primary">
                            {formatCurrency(school.fees.boardingMin || 0)} — {formatCurrency(school.fees.boardingMax || school.fees.boardingMin || 0)}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-4">* Fees are approximate and may vary. Contact the school for exact pricing.</p>
                  </>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-border">
                    <p className="text-sm text-text-secondary">
                      Fee structure is currently optional and has not been published by this school yet.
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      Please contact the school directly for current tuition and related costs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-text-primary">Reviews</h2>
                  <Link href="/auth/login" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors">
                    Write a Review
                  </Link>
                </div>
                {reviews.length > 0 ? reviews.map(review => (
                  <div key={review.id} className="bg-white rounded-2xl border border-border p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">{review.userName[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{review.userName}</p>
                          <p className="text-xs text-text-muted">{formatDate(review.createdAt)}</p>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    <h4 className="text-sm font-semibold text-text-primary mb-1">{review.title}</h4>
                    <p className="text-sm text-text-secondary leading-relaxed">{review.content}</p>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <p className="text-text-muted">No reviews yet. Be the first to review!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-2xl border border-border p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Contact School</h3>
              <div className="space-y-3 mb-6">
                <a href={`tel:${school.contact.phone}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Phone</p>
                    <p className="text-sm font-medium text-text-primary">{school.contact.phone}</p>
                  </div>
                </a>
                <a href={`mailto:${school.contact.email}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Email</p>
                    <p className="text-sm font-medium text-text-primary">{school.contact.email}</p>
                  </div>
                </a>
                {school.contact.website && (
                  <a href={school.contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Website</p>
                      <p className="text-sm font-medium text-primary">Visit Website</p>
                    </div>
                  </a>
                )}
              </div>
              {school.contact.whatsapp && (
                <a
                  href={`https://wa.me/${school.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Chat on WhatsApp
                </a>
              )}

              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Send a direct message</h4>
                  <p className="text-xs text-text-secondary mt-1">Start a conversation you can continue from your inbox.</p>
                </div>

                {user?.role === 'user' ? (
                  <>
                    <input
                      type="text"
                      value={subject}
                      onChange={event => setSubject(event.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-xl text-sm"
                      placeholder="Subject"
                    />
                    <textarea
                      rows={4}
                      value={message}
                      onChange={event => setMessage(event.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-xl text-sm resize-none"
                      placeholder="Ask about admissions, fees, visits, or availability."
                    />
                    <button
                      type="button"
                      onClick={startConversation}
                      disabled={sendingMessage || !subject.trim() || !message.trim() || !token}
                      className="w-full px-4 py-3 bg-secondary text-white font-medium rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50"
                    >
                      {sendingMessage ? 'Sending...' : 'Send Message'}
                    </button>
                  </>
                ) : user ? (
                  <p className="text-sm text-text-secondary">Messaging is available from a standard user account.</p>
                ) : (
                  <Link href="/auth/login" className="inline-flex items-center justify-center w-full px-4 py-3 bg-secondary text-white font-medium rounded-xl hover:bg-secondary/90 transition-colors">
                    Sign in to message this school
                  </Link>
                )}
              </div>
            </div>

            {/* Quick Facts */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Facts</h3>
              <div className="space-y-3">
                {[
                  { label: 'Type', value: getSchoolTypeLabel(school.type) },
                  { label: 'Category', value: getSchoolCategoryLabel(school.category) },
                  { label: 'Location', value: `${school.location.city}, ${school.location.region}` },
                  { label: 'Rating', value: `${school.rating} / 5 (${school.reviewCount} reviews)` },
                  { label: 'Facilities', value: `${school.facilities.length} available` },
                  { label: 'Verified', value: school.isVerified ? 'Yes' : 'No' },
                ].map(fact => (
                  <div key={fact.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-text-muted">{fact.label}</span>
                    <span className="text-sm font-medium text-text-primary">{fact.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
