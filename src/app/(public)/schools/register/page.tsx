'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useApp } from '@/context/AppContext';

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
  const { showToast, token } = useApp();
  const { data: optionsData } = useSWR('/api/schools/options', optionsFetcher, {
    revalidateOnFocus: false,
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [form, setForm] = useState({
    name: '', types: [] as string[], secondaryLevel: 'oa' as 'o' | 'oa',
    category: '', gender: 'mixed', description: '',
    phone: '', email: '', website: '', whatsapp: '',
    accountName: '', accountPassword: '', accountConfirm: '',
    address: '', city: '', region: '', country: 'Uganda',
    latitude: '', longitude: '',
    feesDayMin: '', feesDayMax: '',
    facilities: [] as string[],
  });

  const schoolTypes: SelectOption[] = [
    { value: 'daycare', label: 'Daycare' },
    { value: 'kindergarten', label: 'Kindergarten' },
    { value: 'primary', label: 'Primary School' },
    { value: 'secondary', label: 'Secondary School' },
    { value: 'tertiary', label: 'Tertiary Institution' },
    { value: 'university', label: 'University' },
  ];
  const schoolCategories = optionsData?.categories || [];
  const schoolGenders = optionsData?.genders || [];
  const facilities = optionsData?.facilities || [];

  const update = (field: string, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

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
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const addr = data.address || {};

          setForm(prev => ({
            ...prev,
            city: prev.city || addr.city || addr.town || addr.village || '',
            region: prev.region || addr.state || addr.region || '',
            address: prev.address || data.display_name || '',
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
    setLoading(true);

    try {
      let authToken = token;

      if (!authToken) {
        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.accountName,
            email: form.email,
            password: form.accountPassword,
            role: 'school',
          }),
        });
        const signupData = await signupRes.json();
        if (!signupRes.ok) throw new Error(signupData.error || 'Failed to create account');
        authToken = signupData.token;
      }

      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          name: form.name,
          type: form.types
            .map(t => t === 'secondary' ? `secondary_${form.secondaryLevel}` : t)
            .join(','),
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
          dayMin: form.feesDayMin,
          dayMax: form.feesDayMax,
          facilities: form.facilities,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register school');
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
      <div className="flex items-center justify-center gap-2 mb-10">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-text-muted'
            }`}>{s}</div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border p-8">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">School Name *</label>
              <input type="text" required value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="e.g. Kampala Junior Academy"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
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
                      : 'border-border text-text-secondary hover:bg-gray-50'
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
                {schoolTypes.length === 0 && (
                  <p className="text-sm text-text-secondary col-span-full">No type options available yet.</p>
                )}
              </div>
              {form.types.includes('secondary') && (
                <div className="mt-3 pl-4 border-l-2 border-primary/30">
                  <p className="text-xs font-medium text-text-secondary mb-2">Secondary level offered</p>
                  <div className="flex flex-wrap gap-2">
                    {(['o', 'oa'] as const).map(level => (
                      <label key={level} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                        form.secondaryLevel === level ? 'bg-primary/5 border-primary/30 text-primary' : 'border-border text-text-secondary hover:bg-gray-50'
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
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="">{schoolCategories.length ? 'Select category' : 'No category options available'}</option>
                  {schoolCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Gender Mode *</label>
                <select required value={form.gender} onChange={e => update('gender', e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="">{schoolGenders.length ? 'Select gender mode' : 'No gender options available'}</option>
                  {schoolGenders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Description *</label>
              <textarea required value={form.description} onChange={e => update('description', e.target.value)}
                rows={4} placeholder="Tell parents about your school..."
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
            </div>
            <button type="button" onClick={() => {
                if (form.types.length === 0) { showToast('Please select at least one school type', 'error'); return; }
                if (!form.category) { showToast('Please select a category', 'error'); return; }
                setStep(2);
              }}
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
                  <label className="block text-sm font-medium text-text-primary mb-2">Your Full Name *</label>
                  <input type="text" value={form.accountName} onChange={e => update('accountName', e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Password *</label>
                    <input type="password" value={form.accountPassword} onChange={e => update('accountPassword', e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Confirm Password *</label>
                    <input type="password" value={form.accountConfirm} onChange={e => update('accountConfirm', e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>
                <p className="text-xs text-text-muted">Password must be 8+ characters with uppercase, lowercase, and a number.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Phone *</label>
                <input type="tel" required value={form.phone} onChange={e => update('phone', e.target.value)}
                  placeholder="+256 7XX XXX XXX"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">{token ? 'Email *' : 'School Email (login) *'}</label>
                <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                  placeholder="info@school.ac.ug"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <input type="text" required value={form.address} onChange={e => update('address', e.target.value)}
                placeholder="Street address"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div className="rounded-xl border border-border p-3 bg-gray-50">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingGps}
                className="w-full sm:w-auto px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {detectingGps ? 'Detecting location...' : 'Auto-detect GPS location'}
              </button>
              {(form.latitude && form.longitude) && (
                <p className="text-xs text-text-secondary mt-2">
                  Coordinates detected: {form.latitude}, {form.longitude}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">City *</label>
                <input type="text" required value={form.city} onChange={e => update('city', e.target.value)}
                  placeholder="e.g. Kampala"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Region *</label>
                <input type="text" required value={form.region} onChange={e => update('region', e.target.value)}
                  placeholder="e.g. Central Region"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-3 border border-border text-text-primary font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button type="button" onClick={() => {
                  if (!token) {
                    const pwRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
                    if (!form.accountName.trim()) { showToast('Please enter your full name', 'error'); return; }
                    if (!pwRule.test(form.accountPassword)) { showToast('Password must be 8+ chars with uppercase, lowercase, and a number', 'error'); return; }
                    if (form.accountPassword !== form.accountConfirm) { showToast('Passwords do not match', 'error'); return; }
                  }
                  setStep(3);
                }}
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
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
                {facilities.map(f => (
                  <label key={f} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.facilities.includes(f) ? 'bg-primary/5 border-primary/30 text-primary' : 'border-border text-text-secondary hover:bg-gray-50'
                  }`}>
                    <input type="checkbox" checked={form.facilities.includes(f)} onChange={() => toggleFacility(f)} className="sr-only" />
                    <span className="text-sm">{f}</span>
                  </label>
                ))}
                {facilities.length === 0 && (
                  <p className="text-sm text-text-secondary col-span-full">No facility options available yet.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 py-3 border border-border text-text-primary font-semibold rounded-xl hover:bg-gray-50 transition-colors">
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
