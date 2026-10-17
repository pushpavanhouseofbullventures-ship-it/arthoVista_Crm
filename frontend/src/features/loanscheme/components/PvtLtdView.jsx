import React from 'react';

export default function PvtLtdView() {
  const scopeItems = [
    '2 Digital Signature Certificates',
    '2 Director Identification Numbers',
    '1 Name Approval Application',
    'Stamp duty on INR 1 Lakh Authorized Capital',
    'Company Incorporation using SPICe+',
    'Copy of e-MOA & e-AOA',
    'e-PAN & e-TAN',
    'ESIC Registration through SPICe Plus',
    'PF Registration through SPICe Plus',
  ];

  return (
    <div className="pvtltd-page-container">
      {/* Header Section */}
      <div className="pvtltd-header-section">
        <h2 className="pvtltd-main-title">Private Limited Company Registration</h2>
        <p className="pvtltd-header-desc">
          Private Limited Company registration is a preferred way to start a business in India. It offers
          benefits like limited liability protection to founders, separate legal existence, better credibility,
          and ease in raising external funds. It is registered with the Ministry of Corporate Affairs (MCA)
          under the Companies Act, 2013.
        </p>
      </div>

      {/* 2-Column Layout */}
      <div className="pvtltd-content-grid">
        {/* Left Column */}
        <div className="pvtltd-left-col">
          {/* Card 1: Minimum Requirements */}
          <div className="pvtltd-card">
            <div className="pvtltd-card-title">
              <span className="pvtltd-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              <h3>Minimum Requirements</h3>
            </div>

            <ul className="pvtltd-check-list">
              <li className="pvtltd-check-item">
                <span className="pvtltd-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span><strong>2 Directors</strong> — 1 Person should be an Indian National and Indian Resident</span>
              </li>
              <li className="pvtltd-check-item">
                <span className="pvtltd-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span><strong>2 Shareholders</strong> — The Directors can be shareholders</span>
              </li>
              <li className="pvtltd-check-item">
                <span className="pvtltd-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span><strong>Registered Office in India</strong></span>
              </li>
            </ul>
            <p className="mca-time-note">Registering the Company with MCA takes around 20 to 25 working days.</p>
          </div>

          {/* Card 2: Benefits of Private Limited Company */}
          <div className="pvtltd-card">
            <div className="pvtltd-card-title">
              <span className="pvtltd-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </span>
              <h3>Benefits of Private Limited Company</h3>
            </div>

            <div className="benefits-accent-grid">
              <div className="benefit-col">
                <div className="accent-box border-navy">Separate Legal Entity</div>
                <div className="accent-box border-navy">Recognition and better credibility</div>
                <div className="accent-box border-navy">Fund Raising</div>
                <div className="accent-box border-navy">Owning Property</div>
              </div>
              <div className="benefit-col">
                <div className="accent-box border-red">Limited Liability</div>
                <div className="accent-box border-red">Uninterrupted Existence</div>
                <div className="accent-box border-red">Free & Easy transferability of shares</div>
              </div>
            </div>
          </div>

          {/* Card 3: Company Registration Process */}
          <div className="pvtltd-card">
            <div className="pvtltd-card-title">
              <span className="pvtltd-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M7 7h3v10H7z" />
                  <path d="M14 7h3v10h-3z" />
                </svg>
              </span>
              <h3>Company Registration Process</h3>
            </div>

            <div className="process-subheading">How to start/form/make a Private Limited Company?</div>
            <ol className="process-text-list">
              <li>1. Selection of a suitable name</li>
              <li>2. Application to concerned ROC</li>
              <li>3. MOA & AOA</li>
              <li>4. Filing of the Forms & Documents</li>
            </ol>

            <div className="process-subheading" style={{ marginTop: '20px' }}>How to Incorporate a Private Limited Company</div>
            <div className="incorporation-steps-list">
              <div className="incorp-step-item">
                <span className="incorp-badge badge-navy">1</span>
                <span className="incorp-step-text">Obtain DSC (Digital Signature Certificate)</span>
              </div>
              <div className="incorp-step-item">
                <span className="incorp-badge badge-red">2</span>
                <span className="incorp-step-text">Reserve Your Company Name</span>
              </div>
              <div className="incorp-step-item">
                <span className="incorp-badge badge-navy">3</span>
                <span className="incorp-step-text">Submission of MOA & AOA</span>
              </div>
              <div className="incorp-step-item">
                <span className="incorp-badge badge-red">4</span>
                <span className="incorp-step-text">Get Company's Incorporation Certificate</span>
              </div>
              <div className="incorp-step-item">
                <span className="incorp-badge badge-navy">5</span>
                <span className="incorp-step-text">Get Company's PAN & TAN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="pvtltd-right-col">
          {/* Right Card 1: Scope of Work */}
          <div className="pvtltd-card">
            <h3 className="right-card-title">Scope of Work</h3>
            <ul className="pvtltd-check-list">
              {scopeItems.map((item, idx) => (
                <li key={idx} className="pvtltd-check-item">
                  <span className="pvtltd-check-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Please Note Box */}
            <div className="pvtltd-note-box">
              <h4>Please Note:</h4>
              <ul className="note-bullets">
                <li>• GST registration is not included in our scope of work, that cost will be extra (₹5,000 + GST).</li>
                <li>• If Director DIN KYC has not been done, the KYC penalty will be extra: ₹5,000 (Government fees) + ₹1,500 (Our Consultancy fees) + 18% GST.</li>
                <li>• If more than 2 directors, ₹2,500 + GST will be extra per additional Director.</li>
                <li>• For Punjab, Kerala and Madhya Pradesh Companies registration, minimum charges shall be extra than the normal charges.</li>
              </ul>
            </div>
          </div>

          {/* Right Card 2: Commercials */}
          <div className="pvtltd-card" style={{ marginTop: '20px' }}>
            <h3 className="right-card-title">Commercials</h3>
            <div className="commercials-pricing-stack">
              <div className="pricing-row-box">
                <div className="pricing-box-top">
                  <span className="pricing-type-title">Standard Registration:</span>
                  <span className="pricing-amount">₹10,000/- + 18% GST</span>
                </div>
                <div className="pricing-subtext">(Up to 2 directors) For all states except Kerala, Madhya Pradesh, Punjab</div>
              </div>

              <div className="pricing-row-box">
                <div className="pricing-box-top">
                  <span className="pricing-type-title">Kerala Registration:</span>
                  <span className="pricing-amount">₹12,000/- + 18% GST</span>
                </div>
                <div className="pricing-subtext">(Up to 2 directors)</div>
              </div>

              <div className="pricing-row-box">
                <div className="pricing-box-top">
                  <span className="pricing-type-title">Madhya Pradesh Registration:</span>
                  <span className="pricing-amount">₹16,000/- + 18% GST</span>
                </div>
                <div className="pricing-subtext">(Up to 2 directors)</div>
              </div>

              <div className="pricing-row-box">
                <div className="pricing-box-top">
                  <span className="pricing-type-title">Punjab Registration:</span>
                  <span className="pricing-amount">₹18,000/- + 18% GST</span>
                </div>
                <div className="pricing-subtext">(Up to 2 directors)</div>
              </div>

              <div className="pricing-row-box">
                <div className="pricing-box-top">
                  <span className="pricing-type-title">Additional Director:</span>
                  <span className="pricing-amount">₹2,500/- + GST per Director</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="pvtltd-footer-note">
        <p>© 2026 ArthoVista Success Toolkit. All rights reserved.</p>
      </footer>
    </div>
  );
}
