import { useState } from 'react';

export default function TaxExemptionView({ onOpenTaxModal }) {
  const [annualProfit, setAnnualProfit] = useState(2500000);
  const [taxRate, setTaxRate] = useState(25);
  const [showQuickCalc, setShowQuickCalc] = useState(false);

  const calculatedTaxSavedPerYear = (annualProfit * (taxRate / 100));
  const calculatedTaxSaved3Years = calculatedTaxSavedPerYear * 3;

  return (
    <div className="tax-page-container">
      {/* Header Banner with Launch Tax Calculator Button */}
      <div className="tax-header-banner">
        <div className="tax-header-left">
          <h2 className="tax-main-title">Income Tax Exemption for Startups (Section 80-IAC)</h2>
          <p className="tax-header-desc">
            The Inter-Ministerial Board setup by Department of Industrial Policy and Promotion validates Start-ups
            for granting tax related benefits, allowing eligible startups to get full deduction on profits and
            gains from business.
          </p>
        </div>
        <div className="tax-header-right">
          <button
            className="btn-launch-tax-calc"
            onClick={() => {
              if (onOpenTaxModal) {
                onOpenTaxModal();
              } else {
                setShowQuickCalc(!showQuickCalc);
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="16" y1="14" x2="16" y2="18" />
              <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
            </svg>
            <span>Launch Tax Calculator</span>
          </button>
        </div>
      </div>

      {/* Quick Calculator Panel (Toggled if clicked) */}
      {showQuickCalc && (
        <div className="quick-tax-calc-card">
          <div className="quick-calc-header">
            <h3>📊 80-IAC Tax Savings Estimator</h3>
            <button className="close-calc-btn" onClick={() => setShowQuickCalc(false)}>✕</button>
          </div>
          <div className="quick-calc-body">
            <div className="calc-input-group">
              <label>Estimated Annual Net Profit (₹):</label>
              <input
                type="number"
                value={annualProfit}
                onChange={(e) => setAnnualProfit(Number(e.target.value))}
                step={500000}
                className="calc-input"
              />
            </div>
            <div className="calc-input-group">
              <label>Corporate Tax Rate (%):</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="calc-input"
              >
                <option value={22}>22% (Sec 115BAA - New)</option>
                <option value={25}>25% (Pvt Ltd &lt; 400Cr)</option>
                <option value={30}>30% (LLP / Higher)</option>
              </select>
            </div>
            <div className="calc-result-box">
              <div className="result-item">
                <span className="result-label">Annual Tax Saved:</span>
                <span className="result-val">₹{calculatedTaxSavedPerYear.toLocaleString('en-IN')}</span>
              </div>
              <div className="result-item total">
                <span className="result-label">Total 3-Year 80-IAC Savings:</span>
                <span className="result-val highlight">₹{calculatedTaxSaved3Years.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Content Grid */}
      <div className="tax-content-grid">
        {/* Left Column */}
        <div className="tax-left-col">
          {/* Card 1: Inter-Ministerial Board Structure */}
          <div className="tax-card">
            <div className="tax-card-title">
              <span className="tax-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <h3>Inter-Ministerial Board Structure</h3>
            </div>
            <p className="tax-card-intro">
              The Inter-Ministerial Board setup by Department of Industrial Policy and Promotion validates Start-ups
              for granting tax related benefits. The Board comprises of the following members:
            </p>
            <ul className="tax-check-list">
              <li className="tax-check-item">
                <span className="tax-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Joint Secretary, Department for Promotion of Industry and Internal Trade, Convener</span>
              </li>
              <li className="tax-check-item">
                <span className="tax-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Representative of Department of Biotechnology, Member</span>
              </li>
              <li className="tax-check-item">
                <span className="tax-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Representative of Department of Science & Technology, Member</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Eligibility Criteria */}
          <div className="tax-card">
            <div className="tax-card-title">
              <span className="tax-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <h3>Eligibility Criteria</h3>
            </div>
            <p className="tax-card-intro">
              A DIPP recognized Start-up shall be eligible to apply to the Inter-Ministerial Board for full deduction
              on the profits and gains from business. Provided the following conditions are fulfilled:
            </p>
            <div className="eligibility-accent-bar">
              A private limited company or a LLP (limited liability partnership)
            </div>
            <div className="tax-warning-note">
              <span className="warning-icon">⚠️</span>
              <span>
                <strong>Note:</strong> We will do the process only on behalf of you but not giving guarantee for approval
                from Government
              </span>
            </div>
          </div>

          {/* Card 3: Required Documents */}
          <div className="tax-card">
            <div className="tax-card-title">
              <span className="tax-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              <h3>Required Documents</h3>
            </div>
            <div className="documents-stepped-list">
              <div className="doc-step-row">
                <span className="doc-badge badge-navy">1</span>
                <span className="doc-step-text">
                  MOA (for Pvt Ltd) or LLP Deed (for LLP) In Pdf File (sign n stamp of director on all pages)
                </span>
              </div>
              <div className="doc-step-row">
                <span className="doc-badge badge-red">2</span>
                <span className="doc-step-text">
                  From date of incorporation to last financial year - Balance Sheet and P/L (sign n stamp on all pages of director) - CA certified
                </span>
              </div>
              <div className="doc-step-row">
                <span className="doc-badge badge-navy">3</span>
                <span className="doc-step-text">
                  Trading and Profit & Loss Account of Last 3 Years (The Profit and Loss Statement must be CA Certified)
                </span>
              </div>
              <div className="doc-step-row">
                <span className="doc-badge badge-red">4</span>
                <span className="doc-step-text">
                  ITR (from date of incorporation to last Financial year) (ITR Form Acknowledgement)
                </span>
              </div>
              <div className="doc-step-row">
                <span className="doc-badge badge-navy">5</span>
                <span className="doc-step-text">
                  Start-up YouTube Video link (we'll guide and help you.)
                </span>
              </div>
              <div className="doc-step-row">
                <span className="doc-badge badge-red">6</span>
                <span className="doc-step-text">
                  We need to prepare the Pitch deck from the details provided by your end, (we'll do the needful.)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="tax-right-col">
          {/* Right Card 1: Tax Benefits Summary */}
          <div className="tax-card">
            <h3 className="right-card-title">Tax Benefits Summary</h3>
            <ul className="tax-check-list">
              <li className="tax-check-item">
                <span className="tax-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Full deduction on profits and gains from business</span>
              </li>
              <li className="tax-check-item">
                <span className="tax-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Applicable for 3 consecutive assessment years</span>
              </li>
              <li className="tax-check-item">
                <span className="tax-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Must be a DPIIT recognized startup</span>
              </li>
              <li className="tax-check-item">
                <span className="tax-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Eligible to choose any 3 years out of first 10 years</span>
              </li>
            </ul>
          </div>

          {/* Right Card 2: Application Process */}
          <div className="tax-card" style={{ marginTop: '20px' }}>
            <h3 className="right-card-title">Application Process</h3>
            <div className="application-steps-list">
              <div className="app-step-item">
                <span className="app-step-num badge-navy">1</span>
                <div className="app-step-content">
                  <h4>Submit Required Documents</h4>
                  <p>Provide all necessary documents mentioned</p>
                </div>
              </div>
              <div className="app-step-item">
                <span className="app-step-num badge-red">2</span>
                <div className="app-step-content">
                  <h4>Verification Process</h4>
                  <p>Our team verifies and prepares your application</p>
                </div>
              </div>
              <div className="app-step-item">
                <span className="app-step-num badge-navy">3</span>
                <div className="app-step-content">
                  <h4>Submission to Board</h4>
                  <p>Application submitted to the Inter-Ministerial Board</p>
                </div>
              </div>
              <div className="app-step-item">
                <span className="app-step-num badge-red">4</span>
                <div className="app-step-content">
                  <h4>Board Review</h4>
                  <p>Board evaluates and makes decision</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="tax-footer-note">
        <p>© 2026 ArthoVista Success Toolkit. All rights reserved.</p>
      </footer>
    </div>
  );
}
