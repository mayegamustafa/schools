'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { DEFAULT_SITE_CONTENT, COLOR_PRESETS, deriveColorVars } from '@/lib/site-defaults';
import type { SiteContent, HowItWorksStep, FooterColumn, NavLink, ColorPreset } from '@/lib/site-defaults';

interface OptionItem { value: string; label: string; }
interface SchoolOptions {
  types: OptionItem[];
  categories: OptionItem[];
  genders: OptionItem[];
  facilities: string[];
}
interface BrandSettings {
  primaryColor: string;
  accentColor: string;
  successColor: string;
  errorColor: string;
}

function OptionSection({
  title, items, onRemove, onAdd, valuePlaceholder, labelPlaceholder,
}: {
  title: string;
  items: OptionItem[];
  onRemove: (v: string) => void;
  onAdd: (v: string, l: string) => void;
  valuePlaceholder: string;
  labelPlaceholder: string;
}) {
  const [v, setV] = useState('');
  const [l, setL] = useState('');
  const add = () => {
    if (v.trim() && l.trim()) { onAdd(v.trim(), l.trim()); setV(''); setL(''); }
  };
  return (
    <div>
      <p className="text-sm font-medium text-text-primary mb-2">{title}</p>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
        {items.length === 0 && <span className="text-xs text-text-muted italic">No options yet</span>}
        {items.map(item => (
          <span key={item.value} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
            {item.label}
            <button type="button" onClick={() => onRemove(item.value)}
              className="hover:text-error ml-1 leading-none text-base" aria-label={`Remove ${item.label}`}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <input value={v} onChange={e => setV(e.target.value)} placeholder={valuePlaceholder}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="w-full sm:w-36 px-3 py-2 border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        <input value={l} onChange={e => setL(e.target.value)} placeholder={labelPlaceholder}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        <button type="button" onClick={add}
          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors">Add</button>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-text-primary';

function ImageUploadField({
  label, value, onChange, placeholder, token,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  token: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useState<HTMLInputElement | null>(null);
  const fileRef = { current: null as HTMLInputElement | null };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', file.type.startsWith('video/') ? 'video' : 'image');
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      onChange(data.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  void inputRef; // suppress unused warning

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-text-secondary">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? 'https://… or upload below'}
          className={inputCls + ' flex-1'}
        />
        <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium cursor-pointer transition-colors ${
          uploading ? 'opacity-50 cursor-not-allowed bg-surface' : 'bg-surface hover:bg-hover text-text-secondary hover:text-text-primary'
        }`}>
          {uploading ? 'Uploading…' : '⬆ Upload'}
          <input
            ref={el => { fileRef.current = el; }}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="hidden"
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
      </div>
      {value && !value.startsWith('data:') && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="preview" className="mt-1.5 h-24 w-full object-cover rounded-lg border border-border" />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  );
}

function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
      <h2 className="text-base font-semibold text-text-primary border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  );
}

function TagEditor({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [val, setVal] = useState('');
  const add = () => {
    const t = val.trim();
    if (!t) return;
    onChange([...new Set([...tags, t])]);
    setVal('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
        {tags.length === 0 && <span className="text-xs text-text-muted italic">No tags yet</span>}
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))}
              className="hover:text-error ml-1 leading-none text-base" aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder ?? 'Add…'}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        <button type="button" onClick={add}
          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors">Add</button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { token, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'options' | 'brand' | 'content' | null>(null);
  const [activeTab, setActiveTab] = useState<'options' | 'brand' | 'content'>('options');
  const [options, setOptions] = useState<SchoolOptions>({
    types: [], categories: [], genders: [], facilities: [],
  });
  const [brand, setBrand] = useState<BrandSettings>({
    primaryColor: '#2d3640', accentColor: '#8b7355',
    successColor: '#446c56', errorColor: '#904545',
  });
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT as SiteContent);
  const [newFacility, setNewFacility] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOptions(data.schoolOptions);
      setBrand(data.brandSettings);
      if (data.siteContent) setContent({ ...DEFAULT_SITE_CONTENT as SiteContent, ...data.siteContent });
    } catch {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => { load(); }, [load]);

  const removeOption = (kind: 'types' | 'categories' | 'genders', value: string) =>
    setOptions(prev => ({ ...prev, [kind]: prev[kind].filter(o => o.value !== value) }));

  const addOption = (kind: 'types' | 'categories' | 'genders', value: string, label: string) =>
    setOptions(prev => ({ ...prev, [kind]: [...prev[kind].filter(o => o.value !== value), { value, label }] }));

  const addFacility = () => {
    const f = newFacility.trim();
    if (!f) return;
    setOptions(prev => ({ ...prev, facilities: [...new Set([...prev.facilities, f])] }));
    setNewFacility('');
  };

  const saveOptions = async () => {
    setSaving('options');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: 'options', data: options }),
      });
      if (!res.ok) throw new Error();
      showToast('School options saved', 'success');
    } catch {
      showToast('Failed to save options', 'error');
    } finally {
      setSaving(null);
    }
  };

  const applyBrandToPage = (b: typeof brand) => {
    const primary = deriveColorVars(b.primaryColor);
    const accent  = deriveColorVars(b.accentColor);
    const success = deriveColorVars(b.successColor);
    const error   = deriveColorVars(b.errorColor);
    const root = document.documentElement;
    root.style.setProperty('--color-primary',       primary.base);
    root.style.setProperty('--color-primary-light', primary.light);
    root.style.setProperty('--color-primary-dark',  primary.dark);
    root.style.setProperty('--color-accent',        accent.base);
    root.style.setProperty('--color-accent-light',  accent.light);
    root.style.setProperty('--color-accent-dark',   accent.dark);
    root.style.setProperty('--color-success',       success.base);
    root.style.setProperty('--color-success-light', success.light);
    root.style.setProperty('--color-error',         error.base);
  };

  const saveBrand = async () => {
    setSaving('brand');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: 'brand', data: brand }),
      });
      if (!res.ok) throw new Error();
      applyBrandToPage(brand);
      showToast('Brand colors saved — applied site-wide', 'success');
    } catch {
      showToast('Failed to save brand settings', 'error');
    } finally {
      setSaving(null);
    }
  };

  const saveContent = async () => {
    setSaving('content');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: 'content', data: content }),
      });
      if (!res.ok) throw new Error();
      showToast('Site content saved — reload public pages to see changes', 'success');
    } catch {
      showToast('Failed to save site content', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p className="text-text-secondary">Loading settings…</p>;

  const tabs = [
    { id: 'options', label: 'School Options' },
    { id: 'brand', label: 'Brand Colors' },
    { id: 'content', label: 'Site Content' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Platform Settings</h1>
        <p className="text-text-secondary mt-1">Manage school options, brand appearance, and site content.</p>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-border gap-1">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── School Options tab ── */}
      {activeTab === 'options' && (
        <div className="bg-white rounded-2xl border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">School Options</h2>
            <button type="button" onClick={saveOptions} disabled={saving === 'options'}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors">
              {saving === 'options' ? 'Saving…' : 'Save Options'}
            </button>
          </div>

          <OptionSection title="School Types" items={options.types}
            onRemove={v => removeOption('types', v)}
            onAdd={(v, l) => addOption('types', v, l)}
            valuePlaceholder="key e.g. primary" labelPlaceholder="label e.g. Primary School" />

          <OptionSection title="Categories" items={options.categories}
            onRemove={v => removeOption('categories', v)}
            onAdd={(v, l) => addOption('categories', v, l)}
            valuePlaceholder="key e.g. boarding" labelPlaceholder="label e.g. Boarding School" />

          <OptionSection title="Gender Modes" items={options.genders}
            onRemove={v => removeOption('genders', v)}
            onAdd={(v, l) => addOption('genders', v, l)}
            valuePlaceholder="key e.g. girls_only" labelPlaceholder="label e.g. Girls Only" />

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Facilities</p>
            <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
              {options.facilities.length === 0 && <span className="text-xs text-text-muted italic">No facilities yet</span>}
              {options.facilities.map(f => (
                <span key={f} className="flex items-center gap-1 bg-hover px-3 py-1 rounded-full text-xs text-text-secondary">
                  {f}
                  <button type="button" onClick={() => setOptions(p => ({ ...p, facilities: p.facilities.filter(x => x !== f) }))}
                    className="hover:text-error ml-1 leading-none text-base" aria-label={`Remove ${f}`}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newFacility} onChange={e => setNewFacility(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFacility()}
                placeholder="e.g. Swimming Pool"
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              <button type="button" onClick={addFacility}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Brand Colors tab ── */}
      {activeTab === 'brand' && (
        <div className="bg-white rounded-2xl border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Brand Colors</h2>
              <p className="text-xs text-text-muted mt-0.5">Applied site-wide on every page load. Light and dark variants are auto-computed.</p>
            </div>
            <button type="button" onClick={saveBrand} disabled={saving === 'brand'}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors">
              {saving === 'brand' ? 'Saving…' : 'Save Colors'}
            </button>
          </div>

          {/* Preset themes */}
          <div>
            <p className="text-xs font-medium text-text-secondary mb-3">Quick-apply a preset theme:</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset: ColorPreset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    const next = {
                      primaryColor: preset.primaryColor,
                      accentColor: preset.accentColor,
                      successColor: preset.successColor,
                      errorColor: preset.errorColor,
                    };
                    setBrand(next);
                    applyBrandToPage(next);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:bg-hover transition-colors text-xs font-medium text-text-secondary"
                >
                  <span className="flex gap-0.5">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: preset.primaryColor }} />
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: preset.accentColor }} />
                  </span>
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              { key: 'primaryColor', label: 'Primary' },
              { key: 'accentColor', label: 'Accent' },
              { key: 'successColor', label: 'Success' },
              { key: 'errorColor', label: 'Error / Danger' },
            ] as const).map(({ key, label }) => {
              const derived = deriveColorVars(brand[key]);
              return (
                <div key={key}>
                  <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={brand[key]}
                      onChange={e => { const next = { ...brand, [key]: e.target.value }; setBrand(next); applyBrandToPage(next); }}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5" />
                    <input type="text" value={brand[key]}
                      onChange={e => { const next = { ...brand, [key]: e.target.value }; setBrand(next); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) applyBrandToPage(next); }}
                      className="flex-1 min-w-0 px-2 py-1.5 border border-border rounded-lg text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  {/* Light / dark preview row */}
                  <div className="mt-2 flex gap-1">
                    <div className="flex-1 h-5 rounded-l-md border border-border" style={{ background: derived.light }} title="Light variant" />
                    <div className="flex-1 h-5 border-t border-b border-border" style={{ background: derived.base }} title="Base" />
                    <div className="flex-1 h-5 rounded-r-md border border-border" style={{ background: derived.dark }} title="Dark variant" />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-text-muted">Light</span>
                    <span className="text-[9px] text-text-muted">Dark</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Site Content tab ── */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Save bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Changes apply site-wide after saving. Public pages update on next load.</p>
            <button type="button" onClick={saveContent} disabled={saving === 'content'}
              className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors">
              {saving === 'content' ? 'Saving…' : 'Save Content'}
            </button>
          </div>

          {/* Identity */}
          <ContentCard title="Identity">
            <Field label="Site Name">
              <input value={content.siteName}
                onChange={e => setContent(p => ({ ...p, siteName: e.target.value }))}
                className={inputCls} placeholder="e.g. SchoolFinder" />
            </Field>
            <Field label="Logo Type">
              <div className="flex gap-4 mt-1">
                {(['icon', 'image'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                    <input type="radio" value={t} checked={content.logoType === t}
                      onChange={() => setContent(p => ({ ...p, logoType: t }))}
                      className="accent-primary" />
                    {t === 'icon' ? 'Built-in icon (book SVG)' : 'Custom image URL'}
                  </label>
                ))}
              </div>
            </Field>
            {content.logoType === 'image' && (
              <ImageUploadField
                label="Logo Image"
                value={content.logoImageUrl}
                onChange={url => setContent(p => ({ ...p, logoImageUrl: url }))}
                placeholder="https://… or click ⬆ Upload"
                token={token}
              />
            )}
          </ContentCard>

          {/* Hero */}
          <ContentCard title="Hero Section">
            <Field label="Badge text">
              <input value={content.hero.badge}
                onChange={e => setContent(p => ({ ...p, hero: { ...p.hero, badge: e.target.value } }))}
                className={inputCls} />
            </Field>
            <Field label="Heading (H1)">
              <input value={content.hero.title}
                onChange={e => setContent(p => ({ ...p, hero: { ...p.hero, title: e.target.value } }))}
                className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea rows={3} value={content.hero.description}
                onChange={e => setContent(p => ({ ...p, hero: { ...p.hero, description: e.target.value } }))}
                className={inputCls} />
            </Field>
            <ImageUploadField
              label="Banner Image"
              value={content.hero.imageUrl}
              onChange={url => setContent(p => ({ ...p, hero: { ...p.hero, imageUrl: url } }))}
              placeholder="https://… or click ⬆ Upload"
              token={token}
            />
            <Field label="Image Caption">
              <input value={content.hero.imageCaption}
                onChange={e => setContent(p => ({ ...p, hero: { ...p.hero, imageCaption: e.target.value } }))}
                className={inputCls} />
            </Field>
            <Field label="Popular Tags">
              <TagEditor
                tags={content.hero.popularTags}
                onChange={tags => setContent(p => ({ ...p, hero: { ...p.hero, popularTags: tags } }))}
                placeholder="Add a tag…"
              />
            </Field>
          </ContentCard>

          {/* Stats */}
          <ContentCard title="Stats Bar">
            <p className="text-xs text-text-muted -mt-2">Schools count and average rating are computed live from the database. You can customise their labels and the two static values below.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Schools label">
                <input value={content.stats.schoolsLabel}
                  onChange={e => setContent(p => ({ ...p, stats: { ...p.stats, schoolsLabel: e.target.value } }))}
                  className={inputCls} />
              </Field>
              <Field label="Rating label">
                <input value={content.stats.ratingLabel}
                  onChange={e => setContent(p => ({ ...p, stats: { ...p.stats, ratingLabel: e.target.value } }))}
                  className={inputCls} />
              </Field>
              <Field label="Families value">
                <input value={content.stats.familiesValue}
                  onChange={e => setContent(p => ({ ...p, stats: { ...p.stats, familiesValue: e.target.value } }))}
                  className={inputCls} placeholder="e.g. 12K+" />
              </Field>
              <Field label="Families label">
                <input value={content.stats.familiesLabel}
                  onChange={e => setContent(p => ({ ...p, stats: { ...p.stats, familiesLabel: e.target.value } }))}
                  className={inputCls} />
              </Field>
              <Field label="Cities value">
                <input value={content.stats.citiesValue}
                  onChange={e => setContent(p => ({ ...p, stats: { ...p.stats, citiesValue: e.target.value } }))}
                  className={inputCls} placeholder="e.g. 50+" />
              </Field>
              <Field label="Cities label">
                <input value={content.stats.citiesLabel}
                  onChange={e => setContent(p => ({ ...p, stats: { ...p.stats, citiesLabel: e.target.value } }))}
                  className={inputCls} />
              </Field>
            </div>
          </ContentCard>

          {/* How it works */}
          <ContentCard title="How It Works">
            <Field label="Section title">
              <input value={content.howItWorks.title}
                onChange={e => setContent(p => ({ ...p, howItWorks: { ...p.howItWorks, title: e.target.value } }))}
                className={inputCls} />
            </Field>
            <Field label="Section subtitle">
              <input value={content.howItWorks.subtitle}
                onChange={e => setContent(p => ({ ...p, howItWorks: { ...p.howItWorks, subtitle: e.target.value } }))}
                className={inputCls} />
            </Field>
            <div className="space-y-3 mt-1">
              {content.howItWorks.steps.map((step, i) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-2 bg-surface">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase">Step {i + 1}</span>
                    <button type="button" onClick={() => setContent(p => ({
                      ...p, howItWorks: { ...p.howItWorks, steps: p.howItWorks.steps.filter((_, j) => j !== i) },
                    }))} className="text-xs text-error hover:underline">Remove</button>
                  </div>
                  <input value={step.title} placeholder="Step title"
                    onChange={e => setContent(p => {
                      const steps = [...p.howItWorks.steps];
                      steps[i] = { ...steps[i], title: e.target.value };
                      return { ...p, howItWorks: { ...p.howItWorks, steps } };
                    })} className={inputCls} />
                  <textarea rows={2} value={step.desc} placeholder="Step description"
                    onChange={e => setContent(p => {
                      const steps = [...p.howItWorks.steps];
                      steps[i] = { ...steps[i], desc: e.target.value };
                      return { ...p, howItWorks: { ...p.howItWorks, steps } };
                    })} className={inputCls} />
                </div>
              ))}
              <button type="button" onClick={() => setContent(p => ({
                ...p, howItWorks: { ...p.howItWorks, steps: [...p.howItWorks.steps, { title: '', desc: '' } as HowItWorksStep] },
              }))} className="text-sm text-primary hover:underline">+ Add step</button>
            </div>
          </ContentCard>

          {/* CTA */}
          <ContentCard title="CTA Banner">
            <Field label="Title"><input value={content.cta.title} onChange={e => setContent(p => ({ ...p, cta: { ...p.cta, title: e.target.value } }))} className={inputCls} /></Field>
            <Field label="Description"><textarea rows={2} value={content.cta.description} onChange={e => setContent(p => ({ ...p, cta: { ...p.cta, description: e.target.value } }))} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Primary button label"><input value={content.cta.primaryLabel} onChange={e => setContent(p => ({ ...p, cta: { ...p.cta, primaryLabel: e.target.value } }))} className={inputCls} /></Field>
              <Field label="Primary button href"><input value={content.cta.primaryHref} onChange={e => setContent(p => ({ ...p, cta: { ...p.cta, primaryHref: e.target.value } }))} className={inputCls} /></Field>
              <Field label="Secondary button label"><input value={content.cta.secondaryLabel} onChange={e => setContent(p => ({ ...p, cta: { ...p.cta, secondaryLabel: e.target.value } }))} className={inputCls} /></Field>
              <Field label="Secondary button href"><input value={content.cta.secondaryHref} onChange={e => setContent(p => ({ ...p, cta: { ...p.cta, secondaryHref: e.target.value } }))} className={inputCls} /></Field>
            </div>
          </ContentCard>

          {/* Newsletter */}
          <ContentCard title="Newsletter Banner">
            <Field label="Title"><input value={content.newsletter.title} onChange={e => setContent(p => ({ ...p, newsletter: { ...p.newsletter, title: e.target.value } }))} className={inputCls} /></Field>
            <Field label="Subtitle"><input value={content.newsletter.subtitle} onChange={e => setContent(p => ({ ...p, newsletter: { ...p.newsletter, subtitle: e.target.value } }))} className={inputCls} /></Field>
          </ContentCard>

          {/* Footer */}
          <ContentCard title="Footer">
            <Field label="Description">
              <textarea rows={2} value={content.footer.description} onChange={e => setContent(p => ({ ...p, footer: { ...p.footer, description: e.target.value } }))} className={inputCls} />
            </Field>
            <div className="space-y-4 mt-2">
              {content.footer.columns.map((col, ci) => (
                <div key={ci} className="border border-border rounded-xl p-4 space-y-3 bg-surface">
                  <Field label={`Column ${ci + 1} title`}>
                    <input value={col.title}
                      onChange={e => setContent(p => {
                        const cols = [...p.footer.columns];
                        cols[ci] = { ...cols[ci], title: e.target.value };
                        return { ...p, footer: { ...p.footer, columns: cols } };
                      })} className={inputCls} />
                  </Field>
                  <div className="space-y-2">
                    {col.links.map((lk, li) => (
                      <div key={li} className="flex gap-2 items-center">
                        <input value={lk.label} placeholder="Label"
                          onChange={e => setContent(p => {
                            const cols = p.footer.columns.map((c, idx) => idx !== ci ? c : {
                              ...c, links: c.links.map((l, j) => j !== li ? l : { ...l, label: e.target.value }),
                            });
                            return { ...p, footer: { ...p.footer, columns: cols } };
                          })} className={`${inputCls} flex-1`} />
                        <input value={lk.href} placeholder="Href"
                          onChange={e => setContent(p => {
                            const cols = p.footer.columns.map((c, idx) => idx !== ci ? c : {
                              ...c, links: c.links.map((l, j) => j !== li ? l : { ...l, href: e.target.value }),
                            });
                            return { ...p, footer: { ...p.footer, columns: cols } };
                          })} className={`${inputCls} flex-1`} />
                        <button type="button" onClick={() => setContent(p => {
                          const cols = p.footer.columns.map((c, idx) => idx !== ci ? c : {
                            ...c, links: c.links.filter((_, j) => j !== li),
                          });
                          return { ...p, footer: { ...p.footer, columns: cols } };
                        })} className="text-error text-lg leading-none hover:opacity-70">×</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setContent(p => {
                      const cols = p.footer.columns.map((c, idx) => idx !== ci ? c : {
                        ...c, links: [...c.links, { label: '', href: '#' } as FooterColumn['links'][number]],
                      });
                      return { ...p, footer: { ...p.footer, columns: cols } };
                    })} className="text-xs text-primary hover:underline">+ Add link</button>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>

          {/* Nav links */}
          <ContentCard title="Navigation Links">
            <div className="space-y-2">
              {content.navLinks.map((lk, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={lk.label} placeholder="Label"
                    onChange={e => setContent(p => {
                      const nl = [...p.navLinks]; nl[i] = { ...nl[i], label: e.target.value };
                      return { ...p, navLinks: nl };
                    })} className={`${inputCls} flex-1`} />
                  <input value={lk.href} placeholder="/path"
                    onChange={e => setContent(p => {
                      const nl = [...p.navLinks]; nl[i] = { ...nl[i], href: e.target.value };
                      return { ...p, navLinks: nl };
                    })} className={`${inputCls} flex-1`} />
                  <button type="button" onClick={() => setContent(p => ({ ...p, navLinks: p.navLinks.filter((_, j) => j !== i) }))}
                    className="text-error text-lg leading-none hover:opacity-70">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setContent(p => ({ ...p, navLinks: [...p.navLinks, { label: '', href: '/' } as NavLink] }))}
                className="text-sm text-primary hover:underline">+ Add link</button>
            </div>
          </ContentCard>

          {/* Sticky save at bottom */}
          <div className="flex justify-end pt-2 pb-8">
            <button type="button" onClick={saveContent} disabled={saving === 'content'}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors">
              {saving === 'content' ? 'Saving…' : 'Save All Content'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
