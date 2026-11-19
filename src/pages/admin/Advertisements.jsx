import React, { useState, useEffect, useCallback } from 'react';
import {
  createAdvertisementApi,
  deleteAdvertisementApi,
  getAdvertisementsApi,
  getAdvertisementStatisticsApi,
  updateAdvertisementApi,
  updateAdvertisementStatusApi
} from '../../api/advertisements.api';
import api from '../../api/axios';
import AdvertisementImageCropper from '../../components/AdvertisementImageCropper';
import AdvertisementCustomersModel from '../../components/admin/AdvertisementCustomersModel';

const PLACEMENT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'shop_list', label: 'Shop List' },
  { value: 'check_token', label: 'Check Token' },
  { value: 'queue_status', label: 'Queue Status' },
  { value: 'final_call', label: 'Final Call' },
  { value: 'arrived', label: 'Arrived' }
];

const EMPTY_FORM = {
  event_title: '',
  image_url: '',
  image_file: null,
  redirect_url: '',
  cta_text: '',        // Added cta_text
  shop_id: [],
  placement: ['shop_list'],
  display_order: 1,
  start_date: '',      // Added start_date
  end_date: '',        // Added end_date
  is_active: true
};

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export default function AdvertisementManagement({
  navigate = () => { },
  refreshing = false,
  error = null,
  statistics = {
    total: 0,
    live: 0,
    impressions: 0,
    uniqueVisitors: 0,
    clicks: 0,
    uniqueClickers: 0,
    ctr: 0
  },
  initialAdvertisements = []
}) {
  // TAB CONTROL ("list" | "create" | "edit")
  const [activeTab, setActiveTab] = useState('list');
  const [advertisements, setAdvertisements] = useState(initialAdvertisements);
  const [advertisementStatistics, setAdvertisementStatistics] = useState(statistics);
  const [performanceByPlacement, setPerformanceByPlacement] = useState([]);
  const [selectedAdId, setSelectedAdId] = useState(null);

  // SEARCH & FILTER
  const [search, setSearch] = useState('');
  const [filterPlacement, setFilterPlacement] = useState('all_placements');

  // FORM STATES
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [formError, setFormError] = useState('');
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [loadingAdvertisements, setLoadingAdvertisements] = useState(true);
  const [apiError, setApiError] = useState('');

  const [cropFile, setCropFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  // FETCH PERFORMANCE BY PLACEMENT API
  const loadPerformanceByPlacement = async () => {
    try {
      const response = await api.get('/advertisements/performance-by-placement');
      const data = response.data?.data || response.data || [];
      setPerformanceByPlacement(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load performance by placement:', err);
    }
  };

  const loadAdvertisements = async () => {
    try {
      setLoadingAdvertisements(true);
      setApiError('');
      const [result, statisticsResult] = await Promise.all([
        getAdvertisementsApi(),
        getAdvertisementStatisticsApi()
      ]);
      setAdvertisements(result.advertisements || result || []);
      setAdvertisementStatistics(statisticsResult || statistics);
      await loadPerformanceByPlacement();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to load advertisements.');
    } finally {
      setLoadingAdvertisements(false);
    }
  };

  // LOAD ALL DATA ON MOUNT
  useEffect(() => {
    const loadData = async () => {
      try {
        setShopsLoading(true);
        const [advertisementResult, statisticsResult, performanceResult, shopsResponse] = await Promise.all([
          getAdvertisementsApi(),
          getAdvertisementStatisticsApi(),
          api.get('/advertisements/performance-by-placement'),
          api.get('/shops')
        ]);

        setAdvertisements(advertisementResult.advertisements || advertisementResult || []);
        setAdvertisementStatistics(statisticsResult || statistics);

        const perfData = performanceResult.data?.data || performanceResult.data || [];
        setPerformanceByPlacement(Array.isArray(perfData) ? perfData : []);

        const shopsData = shopsResponse.data?.data ?? shopsResponse.data;
        const shopList = Array.isArray(shopsData) ? shopsData : shopsData?.shops ?? [];
        setShops(shopList.map((shop) => ({
          ...shop,
          id: shop.id ?? shop._id,
          name: shop.name ?? shop.shopName
        })));
      } catch (err) {
        setApiError(err.response?.data?.message || 'Failed to load advertisements or shops.');
      } finally {
        setShopsLoading(false);
        setLoadingAdvertisements(false);
      }
    };
    loadData();
  }, []);

  // SWITCH TO CREATE TAB
  const handleOpenCreate = () => {
    setForm({ ...EMPTY_FORM });
    setImagePreview('');
    setFormError('');
    setSelectedAdId(null);
    setActiveTab('create');
  };

  // SWITCH TO EDIT TAB
  const handleOpenEdit = (ad) => {
    setSelectedAdId(ad.id);
    setForm({
      event_title: ad.eventTitle || ad.event_title || '',
      image_url: ad.imageUrl || ad.image_url || '',
      image_file: null,
      redirect_url: ad.redirectUrl || ad.redirect_url || '',
      cta_text: ad.ctaText || ad.cta_text || '',
      shop_id: normalizeArray(ad.shopIds ?? ad.shop_ids ?? ad.shopId ?? ad.shop_id),
      placement: normalizeArray(ad.placements ?? ad.placement ?? ['shop_list']),
      display_order: ad.displayOrder ?? ad.display_order ?? 1,
      start_date: formatDateForInput(ad.startDate || ad.start_date),
      end_date: formatDateForInput(ad.endDate || ad.end_date),
      is_active: ad.isActive ?? ad.is_active ?? true
    });
    setImagePreview(ad.imageUrl || ad.image_url || '');
    setFormError('');
    setActiveTab('edit');
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image.");
      return;
    }

    setFormError("");
    setCropFile(file);
    setShowCropper(true);
  };

  const handleCroppedImage = (file) => {
    setCropFile(null);
    setShowCropper(false);
    handleFormChange('image_file', file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const validateForm = () => {
    if (!form.event_title.trim()) return 'Event title is required.';
    if (!form.image_url && !form.image_file) return 'Please upload an advertisement banner.';
    if (!form.placement.length) return 'Please select at least one placement.';
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      return 'End date cannot be before start date.';
    }
    return null;
  };

  const handleSaveAdvertisement = async (e) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    setSaving(true);
    try {
      const payload = activeTab === 'edit'
        ? await updateAdvertisementApi(selectedAdId, form)
        : await createAdvertisementApi(form);

      setAdvertisements((prev) => activeTab === 'create'
        ? [payload, ...prev]
        : prev.map((item) => (item.id === selectedAdId ? payload : item)));

      setActiveTab('list');
      loadPerformanceByPlacement();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to save advertisement.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id) => {
    const advertisement = advertisements.find((ad) => ad.id === id);
    if (!advertisement) return;

    const currentStatus = advertisement.isActive ?? advertisement.is_active;

    try {
      const updated = await updateAdvertisementStatusApi(id, !currentStatus);
      setAdvertisements((prev) => prev.map((ad) => (ad.id === id ? updated : ad)));
      loadPerformanceByPlacement();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to update advertisement status.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this advertisement?')) {
      try {
        await deleteAdvertisementApi(id);
        setAdvertisements((prev) => prev.filter((ad) => ad.id !== id));
        loadPerformanceByPlacement();
      } catch (err) {
        setApiError(err.response?.data?.message || 'Failed to delete advertisement.');
      }
    }
  };

  // FILTER LOGIC
  const filteredAdvertisements = advertisements.filter((ad) => {
    const title = ad.eventTitle || ad.event_title || '';
    const matchesSearch = title.toLowerCase().includes(search.toLowerCase());
    const matchesPlacement =
      filterPlacement === 'all_placements' || normalizeArray(ad.placements ?? ad.placement).includes(filterPlacement);
    return matchesSearch && matchesPlacement;
  });

  const placementLabel = (value) => {
    const values = normalizeArray(value);
    return values.map((val) => {
      const found = PLACEMENT_OPTIONS.find((p) => p.value === val);
      return found ? found.label : val;
    }).join(', ');
  };

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const current = normalizeArray(prev[field]);
      const next = current.includes(value)
        ? current.filter((item) => String(item) !== String(value))
        : [...current, value];
      return { ...prev, [field]: next };
    });
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans text-slate-800">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-transform active:scale-95"
          >
            <i className="ti ti-arrow-left text-lg" />
          </button>
          <div>
            <h2 className="m-0 text-lg font-bold text-slate-900">Advertisement Management</h2>
            <p className="m-0 text-xs text-slate-500">Configure promotional banners and active tabs</p>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${activeTab === 'list'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <i className="ti ti-list mr-1.5" />
            All Ads ({advertisements.length})
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${activeTab === 'create'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <i className="ti ti-plus mr-1.5" />
            Create Ad
          </button>
          {activeTab === 'edit' && (
            <button
              type="button"
              className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-slate-900 shadow-sm"
            >
              <i className="ti ti-edit mr-1.5" />
              Edit Ad
            </button>
          )}
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="mx-auto max-w-5xl px-4 py-5">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <i className="ti ti-alert-circle text-base" />
            {error}
          </div>
        )}
        {apiError && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <span><i className="ti ti-alert-circle mr-2 text-base" />{apiError}</span>
            <button type="button" onClick={loadAdvertisements} className="font-bold underline">Retry</button>
          </div>
        )}

        {/* TAB 1: ALL ADS LIST */}
        {activeTab === 'list' && (
          <>
            {/* STATS */}
            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
              {[
                { label: 'Total Ads', value: advertisementStatistics.total, color: 'text-amber-600', icon: 'ti-photo' },
                { label: 'Live', value: advertisementStatistics.live, color: 'text-emerald-600', icon: 'ti-circle-check' },
                { label: 'Impressions', value: advertisementStatistics.impressions.toLocaleString(), color: 'text-purple-600', icon: 'ti-eye' },
                { label: 'Clicks', value: (advertisementStatistics.clicks ?? 0).toLocaleString(), color: 'text-cyan-600', icon: 'ti-pointer' },
                { label: 'Unique Clicks', value: (advertisementStatistics.uniqueClicks ?? advertisementStatistics.uniqueClickers ?? 0).toLocaleString(), color: 'text-indigo-600', icon: 'ti-user-check' },
                { label: 'CTR', value: `${advertisementStatistics.ctr}%`, color: 'text-orange-500', icon: 'ti-trending-up' }
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <i className={`ti ${s.icon} ${s.color} mb-1 block text-2xl`} />
                  <p className="m-0 text-xs text-slate-500">{s.label}</p>
                  <h3 className="m-0 text-xl font-bold text-slate-900">{s.value}</h3>
                </div>
              ))}
            </div>

            {/* PERFORMANCE BY PLACEMENT TABLE */}
            <div className="mb-6 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
              <h3 className="m-0 mb-4 text-base font-bold text-slate-900">
                Performance by placement
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 font-bold">
                      <th className="py-3 px-4">Placement</th>
                      <th className="py-3 px-4 text-center">Ads</th>
                      <th className="py-3 px-4 text-center">Live</th>
                      <th className="py-3 px-4 text-center">Impressions</th>
                      <th className="py-3 px-4 text-center">Clicks</th>
                      <th className="py-3 px-4 text-center">Unique Clicks</th>
                      <th className="py-3 px-4 text-center">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {performanceByPlacement.length > 0 ? (
                      performanceByPlacement.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{row.label || row.placement}</td>
                          <td className="py-3 px-4 text-center">{row.total ?? 0}</td>
                          <td className="py-3 px-4 text-center">{row.live ?? 0}</td>
                          <td className="py-3 px-4 text-center">{(row.impressions ?? 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-center">{(row.clicks ?? 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-center">{(row.uniqueClicks ?? 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-center">{row.ctr ?? 0}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-4 text-center text-slate-400">Loading placement data...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search advertisements..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-10 text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['all_placements', ...PLACEMENT_OPTIONS.map((p) => p.value)].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterPlacement(key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${filterPlacement === key
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {key === 'all_placements' ? 'All' : placementLabel(key)}
                  </button>
                ))}
              </div>
            </div>

            {/* CARDS LIST */}
            {loadingAdvertisements ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
                Loading advertisements...
              </div>
            ) : filteredAdvertisements.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                <i className="ti ti-photo-off mb-2 block text-4xl text-slate-400" />
                <p className="font-semibold text-slate-800">No advertisements found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredAdvertisements.map((ad) => {
                  const title = ad.eventTitle || ad.event_title || 'Untitled Banner';
                  const imageUrl = ad.imageUrl || ad.image_url;
                  const isActive = ad.isActive ?? ad.is_active ?? true;
                  const displayOrder = ad.displayOrder ?? ad.display_order ?? 1;
                  const impressions = ad.impressions ?? 0;
                  const clicks = ad.clicks ?? 0;

                  return (
                    <div
                      key={ad.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:flex-row"
                    >
                      <div className="relative aspect-[8/3] w-full bg-slate-100 sm:w-56">
                        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
                        <span
                          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}
                        >
                          {isActive ? 'Live' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <div className="flex items-start justify-between">
                            <h4 className="m-0 text-sm font-bold text-slate-900">{title}</h4>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              Order #{displayOrder}
                            </span>
                          </div>
                          <p className="m-0 mt-1 text-xs font-semibold text-blue-600">
                            {placementLabel(ad.placement)}
                          </p>
                        </div>

                        {/* IMPRESSIONS AND CLICKS STATS (ABOVE BUTTONS) */}
                        <div className="mt-3 flex items-center gap-4 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <i className="ti ti-eye text-purple-600 font-bold" />
                            <span>Impressions:</span>
                            <span className="font-extrabold text-slate-900">{impressions.toLocaleString()}</span>
                          </div>

                          <div className="h-3 w-[1px] bg-slate-200" />

                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <i className="ti ti-pointer text-cyan-600 font-bold" />
                            <span>Clicks:</span>
                            <span className="font-extrabold text-slate-900">{clicks.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          <AdvertisementCustomersModel
                            advertisement={ad}
                          />
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ad)}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(ad.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${isActive
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                          >
                            {isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ad.id)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 cursor-pointer"
                          >
                            Delete
                          </button>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 2 & 3: CREATE / EDIT TAB VIEW */}
        {(activeTab === 'create' || activeTab === 'edit') && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="m-0 text-base font-bold text-slate-900">
                  {activeTab === 'create' ? 'Create New Advertisement' : 'Edit Advertisement'}
                </h3>
                <p className="m-0 text-xs text-slate-500">
                  Fill in the details below to update banner settings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back to List
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveAdvertisement} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-800">
                  Advertisement Title
                </label>
                <input
                  type="text"
                  value={form.event_title}
                  onChange={(e) => handleFormChange('event_title', e.target.value)}
                  placeholder="e.g. Festival Special Offer"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-800">
                  Banner Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />

                <p className="mt-1 text-[11px] text-slate-500">
                  Required banner size: <strong>1200 × 450 px</strong>
                </p>

                {imagePreview && (
                  <div className="relative mt-3 aspect-[1200/450] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={imagePreview}
                      alt="Advertisement Preview"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">
                      1200 × 450
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-800">
                    Placement <span className="font-normal text-slate-500">(Select multiple)</span>
                  </label>
                  <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                    {PLACEMENT_OPTIONS.filter((opt) => opt.value !== 'all').map((opt) => (
                      <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={normalizeArray(form.placement).includes(opt.value)}
                          onChange={() => toggleArrayValue('placement', opt.value)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Selected: {normalizeArray(form.placement).length}</p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-800">
                    Target Shops <span className="font-normal text-slate-500">(Optional · Select multiple)</span>
                  </label>
                  <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                    {shopsLoading ? (
                      <p className="m-0 text-xs text-slate-500">Loading shops...</p>
                    ) : shops.length ? shops.map((shop) => (
                      <label key={shop.id} className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={normalizeArray(form.shop_id).some((id) => String(id) === String(shop.id))}
                          onChange={() => toggleArrayValue('shop_id', shop.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        {shop.name}
                      </label>
                    )) : (
                      <p className="m-0 text-xs text-slate-500">No shops available.</p>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">No shop selected means all shops. Selected: {normalizeArray(form.shop_id).length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-800">
                    Redirect Link
                  </label>
                  <input
                    type="text"
                    value={form.redirect_url}
                    onChange={(e) => handleFormChange('redirect_url', e.target.value)}
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400"
                  />
                </div>

                {/* Added CTA Text Field */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-800">
                    CTA Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.cta_text}
                    onChange={(e) => handleFormChange('cta_text', e.target.value)}
                    placeholder="e.g. Book Now, Learn More"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Added Start Date and End Date Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-800">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-800">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-800">
                    Display Priority Order
                  </label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => handleFormChange('display_order', e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => handleFormChange('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="is_active" className="text-xs font-semibold text-slate-800">
                  Publish Advertisement immediately
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="h-10 rounded-xl border border-slate-200 px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : activeTab === 'create' ? 'Create Ad' : 'Update Ad'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      {showCropper && cropFile && (
        <AdvertisementImageCropper
          file={cropFile}
          onCropComplete={handleCroppedImage}
          onCancel={() => {
            setCropFile(null);
            setShowCropper(false);
          }}
        />
      )}
    </div>
  );
}