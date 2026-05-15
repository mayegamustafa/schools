'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';

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

export default function AdminSettingsPage() {
  const { token, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'options' | 'brand' | null>(null);
  const [options, setOptions] = useState<SchoolOptions>({
    types: [], categories: [], genders: [], facilities: [],
  });
  const [brand, setBrand] = useState<BrandSettings>({
    primaryColor: '#2d3640', accentColor: '#8b7355',
    successColor: '#446c56', errorColor: '#904545',
  });
  const [newFacility, setNewFacility] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOptions(data.schoolOptions);
      setBrand(data.brandSettings);
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

  const saveBrand = async () => {
    setSaving('brand');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: 'brand', data: brand }),
      });
      if (!res.ok) throw new Error();
      // Apply immediately to current page without reload
      document.documentElement.style.setProperty('--color-primary', brand.primaryColor);
      document.documentElement.style.setProperty('--color-accent', brand.accentColor);
      document.documentElement.style.setProperty('--color-success', brand.successColor);
      document.documentElement.style.setProperty('--color-error', brand.errorColor);
      showToast('Brand colors saved — applied site-wide', 'success');
    } catch {
      showToast('Failed to save brand settings', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p className="text-text-secondary">Loading settings…</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Platform Settings</h1>
        <p className="text-text-secondary mt-1">Manage school dropdown options and brand appearance.</p>
      </div>

      {/* School Options */}
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

      {/* Brand Colors */}
      <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Brand Colors</h2>
            <p className="text-xs text-text-muted mt-0.5">Applied site-wide on every page load.</p>
          </div>
          <button type="button" onClick={saveBrand} disabled={saving === 'brand'}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors">
            {saving === 'brand' ? 'Saving…' : 'Save Colors'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { key: 'primaryColor', label: 'Primary' },
            { key: 'accentColor', label: 'Accent' },
            { key: 'successColor', label: 'Success' },
            { key: 'errorColor', label: 'Error / Danger' },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand[key]}
                  onChange={e => setBrand(p => ({ ...p, [key]: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5" />
                <input type="text" value={brand[key]}
                  onChange={e => setBrand(p => ({ ...p, [key]: e.target.value }))}
                  className="flex-1 min-w-0 px-2 py-1.5 border border-border rounded-lg text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div className="mt-2 h-6 rounded-md border border-border" style={{ background: brand[key] }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
