import { useEffect, useState } from 'react';
import { CATEGORIES } from '../data/seedSchemes';

const emptyForm = {
  name: '',
  status: 'Active',
  category: CATEGORIES[0],
  schemeType: '',
  organization: '',
  lastDate: '',
  amount: '',
  applicableFor: 'Pan India',
  portalLink: '',
  benefits: '',
  eligibility: '',
  focusSectors: '',
  industrySectors: '',
  companyTypes: 'Private Limited, LLP, Registered Partnership, Proprietorship',
};

const COMMON_SECTORS = [
  'Fintech',
  'Health-Tech',
  'Agri-Tech',
  'Edtech',
  'Clean-Tech',
  'Deeptech / AI / ML',
  'Manufacturing / MSME',
  'E-Commerce',
  'Renewable Energy',
  'Robotics & IoT',
];

const COMMON_COMPANY_TYPES = [
  'Private Limited',
  'LLP',
  'Registered Partnership',
  'Sole Proprietorship',
  'One Person Company (OPC)',
  'DPIIT Recognized Startup',
];

function schemeToForm(scheme) {
  if (!scheme) return emptyForm;
  return {
    name: scheme.name || '',
    status: scheme.status || 'Active',
    category: scheme.category || CATEGORIES[0],
    schemeType: scheme.schemeType || '',
    organization: scheme.organization || '',
    lastDate: scheme.lastDate || '',
    amount: scheme.amount || '',
    applicableFor: scheme.applicableFor || 'Pan India',
    portalLink: scheme.portalLink || '',
    benefits: Array.isArray(scheme.benefits) ? scheme.benefits.join('\n') : scheme.benefits || '',
    eligibility: Array.isArray(scheme.eligibility) ? scheme.eligibility.join('\n') : scheme.eligibility || '',
    focusSectors: Array.isArray(scheme.focusSectors) ? scheme.focusSectors.join(', ') : scheme.focusSectors || '',
    industrySectors: Array.isArray(scheme.industrySectors) ? scheme.industrySectors.join(', ') : scheme.industrySectors || '',
    companyTypes: Array.isArray(scheme.companyTypes) ? scheme.companyTypes.join(', ') : scheme.companyTypes || '',
  };
}

function linesToArray(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function csvToArray(text) {
  if (!text) return [];
  return text
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function SchemeForm({ editingScheme, onSave, onCancel, isSuperAdmin = true }) {
  const [form, setForm] = useState(() => schemeToForm(editingScheme));
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'benefits' | 'sectors'

  useEffect(() => {
    setForm(schemeToForm(editingScheme));
  }, [editingScheme]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const addSectorChip = (sector) => {
    const list = csvToArray(form.focusSectors);
    if (!list.includes(sector)) {
      list.push(sector);
      setForm((f) => ({ ...f, focusSectors: list.join(', ') }));
    }
  };

  const addCompanyTypeChip = (ct) => {
    const list = csvToArray(form.companyTypes);
    if (!list.includes(ct)) {
      list.push(ct);
      setForm((f) => ({ ...f, companyTypes: list.join(', ') }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert('Permission Denied: Only Admin can save or update schemes.');
      return;
    }
    if (!form.name.trim()) return;

    const payload = {
      ...(editingScheme ? { id: editingScheme.id } : {}),
      name: form.name.trim(),
      status: form.status,
      category: form.category,
      schemeType: form.schemeType.trim(),
      organization: form.organization.trim(),
      lastDate: form.lastDate.trim(),
      amount: form.amount.trim(),
      applicableFor: form.applicableFor.trim(),
      portalLink: form.portalLink.trim(),
      benefits: linesToArray(form.benefits),
      eligibility: linesToArray(form.eligibility),
      focusSectors: csvToArray(form.focusSectors),
      industrySectors: csvToArray(form.industrySectors),
      companyTypes: csvToArray(form.companyTypes),
    };

    onSave(payload);
    if (!editingScheme) setForm(emptyForm);
  };

  return (
    <div className="admin-form-card">
      <div className="form-header-banner">
        <div className="form-header-left">
          <span className="form-header-icon">{editingScheme ? '✏️' : '✨'}</span>
          <div>
            <h3>{editingScheme ? `Edit: ${editingScheme.name}` : 'Create New Scheme'}</h3>
            <p className="form-subtitle">
              {editingScheme
                ? 'Update scheme grants, subsidies, criteria and deadlines.'
                : 'Publish a new funding or government scheme to the directory.'}
            </p>
          </div>
        </div>
        <div className="super-admin-shield-badge">
          👑 Admin Author
        </div>
      </div>

      <div className="form-sub-tabs">
        <button
          type="button"
          className={`form-sub-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          1. General & Funding
        </button>
        <button
          type="button"
          className={`form-sub-tab-btn ${activeTab === 'benefits' ? 'active' : ''}`}
          onClick={() => setActiveTab('benefits')}
        >
          2. Benefits & Eligibility
        </button>
        <button
          type="button"
          className={`form-sub-tab-btn ${activeTab === 'sectors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sectors')}
        >
          3. Sectors & Entities
        </button>
      </div>

      <form className="enhanced-scheme-form" onSubmit={handleSubmit}>
        {activeTab === 'general' && (
          <div className="form-section-body">
            <div className="form-grid">
              <div className="form-field full">
                <label>Scheme Name <span className="req">*</span></label>
                <input
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. BIRAC BIG (Biotechnology Ignition Grant)"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label>Category <span className="req">*</span></label>
                <select value={form.category} onChange={set('category')} className="form-input">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Status <span className="req">*</span></label>
                <select value={form.status} onChange={set('status')} className="form-input">
                  <option value="Active">🟢 Active</option>
                  <option value="Closed">🔴 Closed</option>
                  <option value="Upcoming">🟡 Upcoming</option>
                </select>
              </div>

              <div className="form-field full">
                <label>Grant / Loan Amount / Subsidy Cap</label>
                <input
                  value={form.amount}
                  onChange={set('amount')}
                  placeholder="e.g. Up to ₹50 Lakhs Grant (100% Non-dilutive)"
                  className="form-input"
                />
              </div>

              <div className="form-field full">
                <label>Issuing Organization / Ministry</label>
                <input
                  value={form.organization}
                  onChange={set('organization')}
                  placeholder="e.g. Department of Biotechnology (DBT), Govt. of India"
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label>Scheme Classification</label>
                <input
                  value={form.schemeType}
                  onChange={set('schemeType')}
                  placeholder="e.g. Central Government Scheme"
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label>Deadline / Application Cycle</label>
                <input
                  value={form.lastDate}
                  onChange={set('lastDate')}
                  placeholder="e.g. 15th of Jan & July every year (Bi-annual)"
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label>Applicable Geographic Region</label>
                <input
                  value={form.applicableFor}
                  onChange={set('applicableFor')}
                  placeholder="e.g. Pan India / State specific"
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label>Application Portal Link</label>
                <input
                  value={form.portalLink}
                  onChange={set('portalLink')}
                  placeholder="https://birac.nic.in/..."
                  className="form-input"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="form-section-body">
            <div className="form-field full">
              <label>Key Benefits & Financial Subsidies (one per line)</label>
              <textarea
                value={form.benefits}
                onChange={set('benefits')}
                rows={5}
                className="form-input textarea"
                placeholder="• Up to ₹50 Lakhs grant support&#10;• Mentoring from domain experts and incubators&#10;• Access to state-of-the-art laboratory infrastructure"
              />
              <span className="form-hint">Each new line becomes an itemized benefit bullet point on the card.</span>
            </div>

            <div className="form-field full" style={{ marginTop: 16 }}>
              <label>Eligibility & Qualification Criteria (one per line)</label>
              <textarea
                value={form.eligibility}
                onChange={set('eligibility')}
                rows={5}
                className="form-input textarea"
                placeholder="• DPIIT recognized startup incorporated within the last 5 years&#10;• Indian founders holding &gt; 51% equity shareholding&#10;• Clear innovative proof-of-concept (TRL 2 to 3)"
              />
              <span className="form-hint">Each new line becomes a distinct qualification checklist item.</span>
            </div>
          </div>
        )}

        {activeTab === 'sectors' && (
          <div className="form-section-body">
            <div className="form-field full">
              <label>Focus Sectors (comma separated)</label>
              <input
                value={form.focusSectors}
                onChange={set('focusSectors')}
                placeholder="Biotech, Healthcare, Agri-Tech, Medtech"
                className="form-input"
              />
              <div className="quick-chips-wrap">
                <span className="chips-label">Quick Add:</span>
                {COMMON_SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip-btn"
                    onClick={() => addSectorChip(s)}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field full" style={{ marginTop: 16 }}>
              <label>Eligible Company / Legal Entity Types (comma separated)</label>
              <input
                value={form.companyTypes}
                onChange={set('companyTypes')}
                placeholder="Private Limited, LLP, Registered Partnership"
                className="form-input"
              />
              <div className="quick-chips-wrap">
                <span className="chips-label">Quick Add:</span>
                {COMMON_COMPANY_TYPES.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    className="chip-btn"
                    onClick={() => addCompanyTypeChip(ct)}
                  >
                    + {ct}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field full" style={{ marginTop: 16 }}>
              <label>Industry Sectors / Domain (comma separated)</label>
              <input
                value={form.industrySectors}
                onChange={set('industrySectors')}
                placeholder="Healthcare, Pharmaceuticals, Industrial Biotechnology"
                className="form-input"
              />
            </div>
          </div>
        )}

        <div className="form-footer-actions">
          <div className="tab-nav-helpers">
            {activeTab !== 'general' && (
              <button
                type="button"
                className="pill-btn outline sm"
                onClick={() =>
                  setActiveTab(activeTab === 'sectors' ? 'benefits' : 'general')
                }
              >
                ← Previous Step
              </button>
            )}
            {activeTab !== 'sectors' && (
              <button
                type="button"
                className="pill-btn outline sm"
                onClick={() =>
                  setActiveTab(activeTab === 'general' ? 'benefits' : 'sectors')
                }
              >
                Next Step →
              </button>
            )}
          </div>

          <div className="submit-actions-group">
            {onCancel && (
              <button type="button" className="pill-btn outline" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="pill-btn btn-funding super-admin-submit-btn"
              disabled={!isSuperAdmin}
            >
              👑 {editingScheme ? 'Save Changes' : '+ Publish Scheme'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
