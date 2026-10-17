import { useState, useMemo } from 'react';
import TopBar from './TopBar.jsx';
import SchemeFilters from './SchemeFilters.jsx';
import SchemeDetail from './SchemeDetail.jsx';
import BenefitsView from './BenefitsView.jsx';
import LoanComparisonView from './LoanComparisonView.jsx';
import StartupIndiaView from './StartupIndiaView.jsx';
import TaxExemptionView from './TaxExemptionView.jsx';
import SeedFundView from './SeedFundView.jsx';
import PvtLtdView from './PvtLtdView.jsx';
import LlpView from './LlpView.jsx';
import DigitalMarketingView from './DigitalMarketingView.jsx';

export default function DashboardView({ schemes = [], benefits = [], resetBenefits, activeCategory = 'ALL SCHEMES', onToggleAdmin, onCloseModal }) {
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState([]);
  const [companyTypeFilter, setCompanyTypeFilter] = useState([]);

  const getPageTitle = () => {
    if (activeCategory === 'DIGITAL MARKETING') return 'Digital Marketing';
    if (activeCategory === 'LLP') return 'LLP Registration';
    if (activeCategory === 'PVT LTD') return 'Private Limited Registration';
    if (activeCategory === 'SEED FUND') return 'Seed Fund Scheme';
    if (activeCategory === 'TAX') return 'Tax Exemption (80-IAC)';
    if (activeCategory === 'START UP') return 'Startup India Benefits';
    if (activeCategory === 'LOAN') return 'Loan Schemes Comparison';
    if (activeCategory === 'BENEFITS') return 'Benefits & Subsidies';
    return 'Loan & Funding Scheme Catalog';
  };

  const toggleSector = (v) => {
    setSectorFilter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };
  const clearSectors = () => {
    setSectorFilter([]);
  };

  const toggleCompanyType = (v) => {
    setCompanyTypeFilter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };
  const clearCompanyTypes = () => {
    setCompanyTypeFilter([]);
  };

  const filtered = useMemo(() => {
    return schemes.filter((s) => {
      if (activeCategory !== 'ALL SCHEMES' && s.category !== activeCategory) {
        if (s.category !== activeCategory) {
          const matchedInTypes = (s.companyTypes || []).some((ct) => ct.toUpperCase().includes(activeCategory));
          const matchedInBenefits = (s.benefits || []).some((b) => b.toUpperCase().includes(activeCategory));
          const matchedInName = (s.name || '').toUpperCase().includes(activeCategory);
          if (!matchedInTypes && !matchedInBenefits && !matchedInName) {
            return false;
          }
        }
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${s.name} ${s.organization} ${s.schemeType || ''} ${s.category || ''} ${(s.benefits || []).join(' ')} ${(s.eligibility || []).join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (sectorFilter.length > 0) {
        const sectors = s.focusSectors || [];
        if (!sectorFilter.some((f) => sectors.includes(f))) return false;
      }

      if (companyTypeFilter.length > 0) {
        const types = s.companyTypes || [];
        if (!companyTypeFilter.some((ct) => types.includes(ct))) return false;
      }

      return true;
    });
  }, [schemes, activeCategory, search, sectorFilter, companyTypeFilter]);

  return (
    <>
      <TopBar
        title={getPageTitle()}
        subtitle="ArthoVista Success Toolkit • Live Government Scheme Engine"
        isAdminView={false}
        onToggleAdmin={onToggleAdmin}
        onCloseModal={onCloseModal}
      />
      <main className="page-body">
        {activeCategory === 'DIGITAL MARKETING' ? (
          <DigitalMarketingView />
        ) : activeCategory === 'LLP' ? (
          <LlpView />
        ) : activeCategory === 'PVT LTD' ? (
          <PvtLtdView />
        ) : activeCategory === 'SEED FUND' ? (
          <SeedFundView />
        ) : activeCategory === 'TAX' ? (
          <TaxExemptionView />
        ) : activeCategory === 'START UP' ? (
          <StartupIndiaView />
        ) : activeCategory === 'LOAN' ? (
          <LoanComparisonView />
        ) : activeCategory === 'BENEFITS' ? (
          <BenefitsView benefits={benefits || []} onReset={resetBenefits} />
        ) : (
          <>
            <SchemeFilters
              schemes={schemes}
              search={search}
              onSearchChange={setSearch}
              sectorFilter={sectorFilter}
              onSectorToggle={toggleSector}
              onSectorClear={clearSectors}
              companyTypeFilter={companyTypeFilter}
              onCompanyTypeToggle={toggleCompanyType}
              onCompanyTypeClear={clearCompanyTypes}
            />

            <div className="schemes-stack">
              {filtered.length === 0 ? (
                <div className="no-results-card">
                  <div className="no-results-icon">🔍</div>
                  <h3>No matching schemes found</h3>
                  <p>Try clearing or adjusting your search filters to see available funding schemes.</p>
                  <button
                    className="reset-filters-btn"
                    onClick={() => {
                      setSearch('');
                      setSectorFilter([]);
                      setCompanyTypeFilter([]);
                    }}
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                filtered.map((scheme) => <SchemeDetail key={scheme.id} scheme={scheme} />)
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
