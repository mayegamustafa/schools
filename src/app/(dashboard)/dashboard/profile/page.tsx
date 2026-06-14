'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';
import { FALLBACK_COVER_IMAGE, FALLBACK_LOGO_IMAGE, sanitizeImageSrc } from '@/utils/helpers';

interface DashboardResponse {
  school: {
    id: string;
    name: string;
    shortDescription: string;
    description: string;
    phone: string;
    email: string;
    website?: string | null;
    address: string;
    city: string;
    region: string;
    country: string;
    whatsapp?: string | null;
    latitude: number;
    longitude: number;
    logo: string;
    coverImage: string;
    gallery: string[];
    videos: string[];
  };
}

interface ProfileForm {
  name: string;
  shortDescription: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  region: string;
  country: string;
  whatsapp: string;
  latitude: string;
  longitude: string;
  logo: string;
  coverImage: string;
  gallery: string[];
  videos: string[];
}

const emptyForm: ProfileForm = {
  name: '',
  shortDescription: '',
  description: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  city: '',
  region: '',
  country: 'Uganda',
  whatsapp: '',
  latitude: '',
  longitude: '',
  logo: '',
  coverImage: '',
  gallery: [],
  videos: [],
};

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load profile');
  return payload as DashboardResponse;
};

export default function DashboardProfilePage() {
  const { token, showToast } = useApp();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    token ? ['/api/dashboard', token] : null,
    fetcher
  );

  useEffect(() => {
    if (!data) return;

    setForm({
      name: data.school.name,
      shortDescription: data.school.shortDescription,
      description: data.school.description,
      phone: data.school.phone,
      email: data.school.email,
      website: data.school.website || '',
      address: data.school.address,
      city: data.school.city,
      region: data.school.region,
      country: data.school.country,
      whatsapp: data.school.whatsapp || '',
      latitude: data.school.latitude ? data.school.latitude.toFixed(6) : '',
      longitude: data.school.longitude ? data.school.longitude.toFixed(6) : '',
      logo: data.school.logo,
      coverImage: data.school.coverImage,
      gallery: data.school.gallery || [],
      videos: data.school.videos || [],
    });
  }, [data]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported on this device', 'error');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const latitude = coords.latitude;
        const longitude = coords.longitude;

        setForm(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const payload = await response.json();
          const address = payload.address || {};

          setForm(prev => ({
            ...prev,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            city: prev.city || address.city || address.town || address.village || '',
            region: prev.region || address.state || address.region || '',
            address: prev.address || payload.display_name || '',
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

  const uploadMedia = async (file: File, kind: 'logo' | 'cover' | 'gallery' | 'video') => {
    if (!token || !data) return;

    setUploadingTarget(kind);
    try {
      const formData = new FormData();
      formData.append('schoolId', data.school.id);
      formData.append('kind', kind === 'video' ? 'video' : 'image');
      formData.append('file', file);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Upload failed');

      setForm(prev => {
        if (kind === 'logo') return { ...prev, logo: payload.url };
        if (kind === 'cover') return { ...prev, coverImage: payload.url };
        if (kind === 'gallery') return { ...prev, gallery: [...prev.gallery, payload.url] };
        return { ...prev, videos: [...prev.videos, payload.url] };
      });

      showToast('Upload complete', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingTarget(null);
    }
  };

  const updateGalleryItem = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      gallery: prev.gallery.map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  };

  const updateVideoItem = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      videos: prev.videos.map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  };

  const removeGalleryItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const removeVideoItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      videos: prev.videos.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveProfile = async () => {
    if (!token || !data) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/schools/${data.school.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          shortDescription: form.shortDescription,
          description: form.description,
          phone: form.phone,
          email: form.email,
          website: form.website || null,
          whatsapp: form.whatsapp || null,
          address: form.address,
          city: form.city,
          region: form.region,
          country: form.country,
          latitude: form.latitude || 0,
          longitude: form.longitude || 0,
          logo: form.logo,
          coverImage: form.coverImage,
          gallery: form.gallery,
          videos: form.videos,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to save profile');

      showToast('School profile updated successfully', 'success');
      await mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Profile access requires sign in</h1>
        <p className="text-text-secondary">Sign in with a school account to edit your listing.</p>
      </div>
    );
  }

  if (isLoading && !data) {
    return <div className="text-text-secondary">Loading profile...</div>;
  }

  if (error || !data) {
    return <p className="text-error">{error instanceof Error ? error.message : 'Unable to load profile'}</p>;
  }

  const previewLogo = sanitizeImageSrc(form.logo, FALLBACK_LOGO_IMAGE);
  const previewCover = sanitizeImageSrc(form.coverImage, FALLBACK_COVER_IMAGE);
  const previewGallery = form.gallery.map(item => sanitizeImageSrc(item, previewCover));
  const previewVideos = form.videos.map(item => item.trim()).filter(Boolean);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-text-primary mb-2">School Profile</h1>
      <p className="text-text-secondary mb-6">Update your public listing information.</p>

      <div className="grid grid-cols-1 md:grid-cols-[160px,1fr] gap-5 mb-6">
        <div className="bg-surface rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-text-secondary mb-3">School Badge</p>
          <div className="relative w-24 h-24 mx-auto rounded-2xl overflow-hidden border border-border bg-hover">
            <Image src={previewLogo} alt="School badge preview" fill className="object-cover" sizes="96px" />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs font-medium text-text-secondary">Cover Preview</p>
            {form.logo && (
              <span className="text-xs text-success">Badge ready</span>
            )}
          </div>
          <div className="relative h-36 rounded-2xl overflow-hidden border border-border bg-hover">
            <Image src={previewCover} alt="Cover image preview" fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">School Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Short Description</label>
          <input
            type="text"
            value={form.shortDescription}
            onChange={e => setForm(prev => ({ ...prev, shortDescription: e.target.value }))}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Description</label>
          <textarea
            rows={5}
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Website</label>
          <input
            type="url"
            value={form.website}
            onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">WhatsApp</label>
          <input
            type="text"
            value={form.whatsapp}
            onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Logo URL</label>
          <input
            type="url"
            value={form.logo}
            onChange={e => setForm(prev => ({ ...prev, logo: e.target.value }))}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm"
          />
          <label className="inline-flex items-center mt-3 px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-hover transition-colors cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) void uploadMedia(file, 'logo');
                event.target.value = '';
              }}
            />
            {uploadingTarget === 'logo' ? 'Uploading logo...' : 'Upload Logo'}
          </label>
          <p className="text-xs text-text-secondary mt-2">Uploaded badge preview is shown above and on the public school page.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Cover Image URL</label>
          <input
            type="url"
            value={form.coverImage}
            onChange={e => setForm(prev => ({ ...prev, coverImage: e.target.value }))}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm"
          />
          <label className="inline-flex items-center mt-3 px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-hover transition-colors cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) void uploadMedia(file, 'cover');
                event.target.value = '';
              }}
            />
            {uploadingTarget === 'cover' ? 'Uploading cover...' : 'Upload Cover Image'}
          </label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-text-primary">Gallery Images</h2>
              <p className="text-xs text-text-secondary mt-1">Upload multiple images for your public gallery.</p>
            </div>
            <label className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-hover transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void uploadMedia(file, 'gallery');
                  event.target.value = '';
                }}
              />
              {uploadingTarget === 'gallery' ? 'Uploading...' : 'Add Image'}
            </label>
          </div>
          <div className="space-y-3">
            {form.gallery.length === 0 ? (
              <p className="text-sm text-text-secondary">No gallery images yet.</p>
            ) : form.gallery.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-border p-3 bg-hover">
                <div className="relative w-full sm:w-28 h-24 rounded-xl overflow-hidden border border-border bg-surface shrink-0">
                  <Image src={previewGallery[index] || previewCover} alt={`Gallery preview ${index + 1}`} fill className="object-cover" sizes="112px" />
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={event => updateGalleryItem(index, event.target.value)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl text-sm"
                />
                <button type="button" onClick={() => removeGalleryItem(index)} className="px-3 py-2 text-sm text-error border border-border rounded-lg hover:bg-hover transition-colors">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-text-primary">School Videos</h2>
              <p className="text-xs text-text-secondary mt-1">Upload videos or paste hosted video URLs.</p>
            </div>
            <label className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-hover transition-colors cursor-pointer">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void uploadMedia(file, 'video');
                  event.target.value = '';
                }}
              />
              {uploadingTarget === 'video' ? 'Uploading...' : 'Add Video'}
            </label>
          </div>
          <div className="space-y-3">
            {form.videos.length === 0 ? (
              <p className="text-sm text-text-secondary">No videos yet.</p>
            ) : form.videos.map((videoUrl, index) => (
              <div key={`${videoUrl}-${index}`} className="flex flex-col gap-3 rounded-2xl border border-border p-3 bg-hover">
                <video
                  src={previewVideos[index] || undefined}
                  controls
                  preload="metadata"
                  className="w-full max-w-md rounded-xl border border-border bg-black"
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={event => updateVideoItem(index, event.target.value)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl text-sm"
                />
                <button type="button" onClick={() => removeVideoItem(index)} className="px-3 py-2 text-sm text-error border border-border rounded-lg hover:bg-hover transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">City</label>
            <input
              type="text"
              value={form.city}
              onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Region</label>
            <input
              type="text"
              value={form.region}
              onChange={e => setForm(prev => ({ ...prev, region: e.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border p-5 bg-hover">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-text-primary">GPS Location</h2>
              <p className="text-xs text-text-secondary mt-1">Pick your school coordinates from this device to improve map visibility and route directions.</p>
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingGps}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {detectingGps ? 'Detecting location...' : 'Use Current Location'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={e => setForm(prev => ({ ...prev, latitude: e.target.value }))}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={e => setForm(prev => ({ ...prev, longitude: e.target.value }))}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-surface"
              />
            </div>
          </div>

          {form.latitude && form.longitude && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
              <p className="text-text-secondary">
                Current coordinates: {form.latitude}, {form.longitude}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${form.latitude},${form.longitude}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Preview on Google Maps
              </a>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={saveProfile}
            className="px-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
