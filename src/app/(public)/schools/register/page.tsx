'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import LocationAutocomplete from '@/components/schools/LocationAutocomplete';
import ImageUploadField from '@/components/schools/ImageUploadField';
import PlaceInput from '@/components/schools/PlaceInput';
import { regionForPlace, suggestPlaces, suggestRegions } from '@/lib/uganda-locations';
import PasswordField, { PasswordChecklist, passwordProblem } from '@/components/ui/PasswordField';
import {
  DEFAULT_CATEGORY_OPTIONS,
  DEFAULT_FACILITIES,
  DEFAULT_GENDER_OPTIONS,
  SELECTABLE_SCHOOL_TYPES,
} from '@/lib/taxonomy';
import { getSchoolTypeLabel } from '@/utils/helpers';

interface SelectOption {
  value: string;
  label: string;
}

interface SchoolOptionsResponse {
  types: SelectOption[];
  categories: SelectOption[];
  genders: SelectOption[];
  facilities: string[];
}

const optionsFetcher = async (url: string) => {
  const res = await fetch(url);
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load school options');
  return payload as SchoolOptionsResponse;
};

export default function RegisterSchoolPage() {
  const router = useRouter();
  const { showToast, token, user, setUser, setToken } = useApp();
  const { data: optionsData } = useSWR('/api/schools/options', optionsFetcher, {
    revalidateOnFocus: false,
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [form, setForm] = useState({
    name: '', types: [] as string[], secondaryLevel: 'oa' as 'o' | 'oa',
    category: '', gender: 'mixed', description: '',
    phone: '', email: '', website: '', whatsapp: '',
    accountName: '', accountPassword: '', accountConfirm: '',
    address: '', city: '', region: '', country: 'Uganda',
    latitude: '', longitude: '',
    logo: '', coverImage: '', gallery: [] as string[],
    feesDayMin: '', feesDayMax: '',
    facilities: [] as string[],
  });

  const TOTAL_STEPS = 4;

  const schoolTypes: SelectOption[] = SELECTABLE_SCHOOL_TYPES.map(value => ({
    value,
    label: getSchoolTypeLabel(value),
  }));
  const schoolCategories = optionsData?.categories || [];
  const schoolGenders = optionsData?.genders || [];
  const facilities = optionsData?.facilities || [];

  const update = (field: string, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear the field's error as soon as the user starts correcting it.
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Live password feedback, but only after the user has typed something — an
  // empty form shouldn't open with red text.
  const passwordError = touchedPassword
    ? passwordProblem(form.accountPassword, form.accountConfirm)
    : null;

  const validateStepOne = (): boolean => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Enter the school name';
    if (form.types.length === 0) next.types = 'Select at least one school type';
    if (!form.category) next.category = 'Select a category';
    if (form.description.trim().length < 10) {
      next.description = 'Add a short description (at least 10 characters)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStepTwo = (): boolean => {
    const next: Record<string, string> = {};
    if (form.phone.trim().length < 6) next.phone = 'Enter a valid phone number';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    if (form.address.trim().length < 5) next.address = 'Enter the school address';
    if (form.city.trim().length < 2) next.city = 'Enter the city';
    if (form.region.trim().length < 2) next.region = 'Enter the region';

    if (!token) {
      if (!form.accountName.trim()) next.accountName = 'Enter your full name';
      const problem = passwordProblem(form.accountPassword, form.accountConfirm);
      if (problem) next.accountPassword = problem;
    }

    setErrors(next);
    if (!token) setTouchedPassword(true);
    return Object.keys(next).length === 0;
  };

  const validatePhotos = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.logo) next.logo = 'Upload your school badge or logo';
    if (!form.coverImage) next.coverImage = 'Upload at least one photo of your school';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /**
   * The account is created when leaving step 2 rather than at final submit, so
   * the photo step has a token to authenticate uploads with. It also means a
   * school owner who abandons the form can sign back in and finish, instead of
   * losing everything.
   */
  const ensureAccount = async (): Promise<string | null> => {
    if (token) return token;

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.accountName,
        email: form.email,
        password: form.accountPassword,
        role: 'school',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error(
          'An account with this email already exists. Please sign in first, then register your school.'
        );
      }
      throw new Error(data.error || 'Failed to create account');
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        favorites: data.user.favorites || [],
        createdAt: new Date().toISOString(),
      });
    }
    setToken(data.token || null);
    return data.token as string;
  };

  const handleStepTwoContinue = async () => {
    if (!validateStepTwo()) return;

    setLoading(true);
    try {
      await ensureAccount();
      setStep(3);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 border rounded-xl text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 ${
      errors[field] ? 'border-error focus:border-error' : 'border-border focus:border-primary'
    }`;

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-error mt-1.5">{errors[field]}</p> : null;

  const toggleType = (t: string) => {
    setForm(prev => ({
      ...prev,
      types: prev.types.includes(t)
        ? prev.types.filter(x => x !== t)
        : [...prev.types, t],
    }));
  };

  const toggleFacility = (f: string) => {
    setForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(f)
        ? prev.facilities.filter(x => x !== f)
        : [...prev.facilities, f],
    }));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported on this device', 'error');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;

        setForm(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));

        try {
          const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const addr = data.address || {};

          // The user explicitly asked to detect — fill all three fields.
          setForm(prev => ({
            ...prev,
            address: data.display_name || prev.address,
            city: addr.city || addr.town || addr.village || addr.municipality || addr.county || prev.city,
            region: addr.state || addr.region || addr.state_district || prev.region,
          }));
          showToast('GPS location detected successfully', 'success');
        } catch {
          showToast('Coordinates detected, but address lookup failed', 'info');
        } finally {
          setDetectingGps(false);
        }
      },
      () => {
        setDetectingGps(false);
        showToast('Unable to access your location', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Re-check the earlier steps — the user can reach the last step and then go
    // back to edit a field, and a server-side 400 is a poor way to find out.
    if (!validateStepOne()) {
      setStep(1);
      showToast('Please complete the highlighted fields', 'error');
      return;
    }
    if (!validateStepTwo()) {
      setStep(2);
      showToast('Please complete the highlighted fields', 'error');
      return;
    }
    if (!validatePhotos()) {
      setStep(3);
      showToast('Please add your school badge and a photo', 'error');
      return;
    }

    setLoading(true);

    try {
      // Normally created back at step 2; this covers the case where that call
      // failed and the user pushed on anyway.
      await ensureAccount();

      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          // Every level the school offers. Secondary carries its O / O&A variant.
          types: form.types.map(t =>
            t === 'secondary' ? `secondary_${form.secondaryLevel}` : t
          ),
          category: form.category,
          gender: form.gender,
          description: form.description,
          shortDescription: form.description.slice(0, 200),
          phone: form.phone,
          email: form.email,
          website: form.website,
          whatsapp: form.whatsapp,
          address: form.address,
          city: form.city,
          region: form.region,
          country: form.country,
          latitude: form.latitude,
          longitude: form.longitude,
          logo: form.logo,
          coverImage: form.coverImage,
          gallery: form.gallery,
          dayMin: form.feesDayMin,
          dayMax: form.feesDayMax,
          facilities: form.facilities,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register school');
      }

      // Registering upgrades a parent account to a school owner and returns a
      // fresh token carrying the new role — store it, or the dashboard redirect
      // bounces straight back to the homepage.
      if (data.token) {
        setToken(data.token);
        if (user) setUser({ ...user, role: 'school' });
      }

      showToast('School registered successfully! Pending admin approval.', 'success');
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register school';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">List Your School</h1>
        <p className="text-text-secondary">
          Register your school on SchoolFinder and reach thousands of parents
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-10">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
          <div key={s} className="flex items-center gap-1.5 sm:gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              step >= s ? 'bg-primary text-white' : 'bg-border text-text-muted'
            }`}>{s}</div>
            {s < TOTAL_STEPS && (
              <div className={`w-8 sm:w-12 h-0.5 transition-colors ${step > s ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-8">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">School Name *</label>
              <input type="text" required value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="Enter your school's full name"
                className={inputClass('name')} />
              <FieldError field="name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                School Type * <span className="text-xs font-normal text-text-muted">(select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {schoolTypes.map(t => (
                  <label key={t.value} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.types.includes(t.value)
                      ? 'bg-primary/5 border-primary/30 text-primary'
                      : 'border-border text-text-secondary hover:bg-hover'
                  }`}>
                    <input type="checkbox" checked={form.types.includes(t.value)} onChange={() => toggleType(t.value)} className="sr-only" />
                    <span className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                      form.types.includes(t.value) ? 'bg-primary border-primary text-white' : 'border-border'
                    }`}>
                      {form.types.includes(t.value) && '\u2713'}
                    </span>
                    <span className="text-sm">{t.label}</span>
                  </label>
                ))}
              </div>
              <FieldError field="types" />
              {form.types.length > 1 && (
                <p className="text-xs text-text-secondary mt-2">
                  Listing {form.types.length} levels — parents searching any of them will find you.
                </p>
              )}
              {form.types.includes('secondary') && (
                <div className="mt-3 pl-4 border-l-2 border-primary/30">
                  <p className="text-xs font-medium text-text-secondary mb-2">Secondary level offered</p>
                  <div className="flex flex-wrap gap-2">
                    {(['o', 'oa'] as const).map(level => (
                      <label key={level} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                        form.secondaryLevel === level ? 'bg-primary/5 border-primary/30 text-primary' : 'border-border text-text-secondary hover:bg-hover'
                      }`}>
                        <input type="radio" name="secondaryLevel" value={level}
                          checked={form.secondaryLevel === level}
                          onChange={() => update('secondaryLevel', level)} className="sr-only" />
                        {level === 'o' ? 'O Level only' : 'O & A Level'}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Category *</label>
                <select required value={form.category} onChange={e => update('category', e.target.value)}
                  className={`${inputClass('category')} bg-surface`}>
                  <option value="">Select category</option>
                  {(schoolCategories.length ? schoolCategories : DEFAULT_CATEGORY_OPTIONS)
                    .map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <FieldError field="category" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Gender Mode *</label>
                <select required value={form.gender} onChange={e => update('gender', e.target.value)}
                  className={`${inputClass('gender')} bg-surface`}>
                  {(schoolGenders.length ? schoolGenders : DEFAULT_GENDER_OPTIONS)
                    .map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Description *</label>
              <textarea required value={form.description} onChange={e => update('description', e.target.value)}
                rows={4} placeholder="Tell parents about your school..."
                className={`${inputClass('description')} resize-none`} />
              <FieldError field="description" />
            </div>
            <button type="button" onClick={() => { if (validateStepOne()) setStep(2); }}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Contact & Location</h2>

            {!token && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-text-primary mb-1">Create your account</p>
                  <p className="text-xs text-text-secondary">You&apos;ll use this to manage your school listing. The school email below will be your login.</p>
                </div>
                <div>
                  <label htmlFor="account-name" className="block text-sm font-medium text-text-primary mb-2">Your Full Name *</label>
                  <input id="account-name" type="text" value={form.accountName}
                    onChange={e => update('accountName', e.target.value)}
                    placeholder="e.g. John Doe" autoComplete="name"
                    className={`${inputClass('accountName')} bg-surface`} />
                  <FieldError field="accountName" />
                </div>

                {/* Stacked, not side by side — two password boxes in a 2-column grid
                    leaves ~150px each on a phone, which is where most school admins
                    are filling this in. */}
                <div className="space-y-4">
                  <div>
                    <PasswordField
                      id="account-password"
                      name="new-password"
                      label="Password *"
                      value={form.accountPassword}
                      onChange={v => {
                        setTouchedPassword(true);
                        update('accountPassword', v);
                      }}
                      placeholder="Choose a strong password"
                      autoComplete="new-password"
                    />
                    <PasswordChecklist value={form.accountPassword} />
                  </div>
                  <PasswordField
                    id="account-confirm"
                    name="confirm-password"
                    label="Confirm Password *"
                    value={form.accountConfirm}
                    onChange={v => {
                      setTouchedPassword(true);
                      update('accountConfirm', v);
                    }}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    error={
                      errors.accountPassword
                      || (form.accountConfirm && form.accountPassword !== form.accountConfirm
                        ? 'Passwords do not match'
                        : passwordError && form.accountConfirm ? passwordError : null)
                    }
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Phone *</label>
                <input type="tel" required value={form.phone} onChange={e => update('phone', e.target.value)}
                  placeholder="+256 7XX XXX XXX" autoComplete="tel"
                  className={inputClass('phone')} />
                <FieldError field="phone" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">{token ? 'Email *' : 'School Email (login) *'}</label>
                <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                  placeholder="info@school.ac.ug" autoComplete="email"
                  className={inputClass('email')} />
                <FieldError field="email" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Website</label>
                <input type="url" value={form.website} onChange={e => update('website', e.target.value)}
                  placeholder="https://school.ac.ug"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">WhatsApp</label>
                <input type="tel" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)}
                  placeholder="+256 7XX XXX XXX"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Address *</label>
              <LocationAutocomplete
                value={form.address}
                onChange={v => update('address', v)}
                onSelect={r => setForm(prev => ({
                  ...prev,
                  address: r.address,
                  city: r.city || prev.city,
                  region: r.region || prev.region,
                  latitude: r.latitude || prev.latitude,
                  longitude: r.longitude || prev.longitude,
                }))}
                placeholder="Start typing the school's location…"
                required
              />
              <FieldError field="address" />
              <p className="text-xs text-text-muted mt-1.5">Type to search, or use GPS below — City &amp; Region fill in automatically.</p>
            </div>
            <div className="rounded-xl border border-border p-3 bg-hover">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingGps}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {detectingGps ? 'Detecting location...' : 'Auto-detect GPS location'}
              </button>
              {(form.latitude && form.longitude) && (
                <p className="text-xs text-text-secondary mt-2">
                  Coordinates detected: {form.latitude}, {form.longitude}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="school-city" className="block text-sm font-medium text-text-primary mb-2">
                  City / District *
                </label>
                <PlaceInput
                  id="school-city"
                  required
                  value={form.city}
                  onChange={v => update('city', v)}
                  // Picking a known district fills the region too — it is always
                  // implied by the district, so asking twice invites mismatches.
                  onPick={picked => {
                    const region = regionForPlace(picked);
                    if (region) update('region', region);
                  }}
                  suggest={q => suggestPlaces(q).map(p => p.name)}
                  placeholder="Start typing, e.g. Kampala"
                  className={inputClass('city')}
                />
                <FieldError field="city" />
              </div>
              <div>
                <label htmlFor="school-region" className="block text-sm font-medium text-text-primary mb-2">
                  Region *
                </label>
                <PlaceInput
                  id="school-region"
                  required
                  value={form.region}
                  onChange={v => update('region', v)}
                  suggest={q => [...suggestRegions(q)]}
                  placeholder="e.g. Central Region"
                  className={inputClass('region')}
                />
                <FieldError field="region" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-3 border border-border text-text-primary font-semibold rounded-xl hover:bg-hover transition-colors">
                Back
              </button>
              <button type="button" onClick={handleStepTwoContinue} disabled={loading}
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60">
                {loading ? 'Please wait…' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">School Photos</h2>
              <p className="text-sm text-text-secondary">
                Listings with a badge and a real photo get noticeably more parent enquiries.
              </p>
            </div>

            <ImageUploadField
              label="School badge / logo"
              hint="Square works best. JPG, PNG, or WebP up to 5 MB."
              kind="logo"
              shape="square"
              required
              token={token}
              value={form.logo}
              onChange={url => update('logo', url)}
              error={errors.logo}
            />

            <ImageUploadField
              label="Cover photo"
              hint="A wide shot of your school — this is the first thing parents see."
              kind="cover"
              shape="wide"
              required
              token={token}
              value={form.coverImage}
              onChange={url => update('coverImage', url)}
              error={errors.coverImage}
            />

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                More photos <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {form.gallery.map((url, i) => (
                  <div key={url} className="relative aspect-video rounded-xl overflow-hidden border border-border">
                    <Image src={url} alt={`School photo ${i + 1}`} fill sizes="200px" className="object-cover" />
                    <button
                      type="button"
                      onClick={() => update('gallery', form.gallery.filter(g => g !== url))}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                ))}
                {form.gallery.length < 8 && (
                  <ImageUploadField
                    label=""
                    kind="gallery"
                    shape="wide"
                    token={token}
                    value=""
                    onChange={url => url && update('gallery', [...form.gallery, url])}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 py-3 border border-border text-text-primary font-semibold rounded-xl hover:bg-hover transition-colors">
                Back
              </button>
              <button type="button" onClick={() => { if (validatePhotos()) setStep(4); }}
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Fees & Facilities</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Lower Section Fees (UGX/term) <span className="text-text-muted">(optional)</span></label>
                <input type="number" value={form.feesDayMin} onChange={e => update('feesDayMin', e.target.value)}
                  placeholder="50000"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Upper Section Fees (UGX/term) <span className="text-text-muted">(optional)</span></label>
                <input type="number" value={form.feesDayMax} onChange={e => update('feesDayMax', e.target.value)}
                  placeholder="100000"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">Facilities</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(facilities.length ? facilities : [...DEFAULT_FACILITIES]).map(f => (
                  <label key={f} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.facilities.includes(f) ? 'bg-primary/5 border-primary/30 text-primary' : 'border-border text-text-secondary hover:bg-hover'
                  }`}>
                    <input type="checkbox" checked={form.facilities.includes(f)} onChange={() => toggleFacility(f)} className="sr-only" />
                    <span className="text-sm">{f}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)}
                className="flex-1 py-3 border border-border text-text-primary font-semibold rounded-xl hover:bg-hover transition-colors">
                Back
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                {loading ? 'Submitting...' : 'Register School'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
