import React from 'react';

export default function SeedFundView() {
  const scopeServices = [
    'Assistance in document formulation',
    'Filling the application',
    'Re-submission as permitted under the Scheme',
    'Guidance/Assistance in negotiation with incubators',
    'Guidance/Assistance in monitoring and reporting',
    'Selection of incubation centres on client behalf',
    'Preparation of Pitch Deck and Financial models',
    'Data Room Services for SISFS application',
  ];

  return (
    <div className="seedfund-page-container">
      {/* Page Header */}
      <div className="seedfund-header-section">
        <h2 className="seedfund-main-title">Startup India Seed Fund Scheme (SISFS)</h2>
        <p className="seedfund-header-desc">
          DPIIT has created Startup India Seed Fund Scheme (SISFS) with an outlay of INR 945 Crore to provide
          financial assistance to startups for Proof of Concept, prototype development, product trials, market
          entry, and commercialization. It will support an estimated 3,600 entrepreneurs through 300 incubators in
          the next 4 years.
        </p>
      </div>

      {/* 2-Column Content Layout */}
      <div className="seedfund-content-grid">
        {/* Left Column */}
        <div className="seedfund-left-col">
          {/* Card 1: Objectives of SISFS */}
          <div className="seedfund-card">
            <div className="seedfund-card-title">
              <span className="seedfund-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </span>
              <h3>Objectives of SISFS</h3>
            </div>
            <p className="seedfund-card-text">
              Many innovative business ideas fail to take off due to the absence of critical capital required at an
              early stage for proof of concept, prototype development, product trials, market entry and
              commercialization. Seed Fund offered to such promising cases can have a multiplier effect in
              validation of business ideas of many startups, leading to employment generation.
            </p>
          </div>

          {/* Card 2: Eligibility Criteria */}
          <div className="seedfund-card">
            <div className="seedfund-card-title">
              <span className="seedfund-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <h3>Eligibility Criteria</h3>
            </div>

            <div className="seedfund-criteria-block border-navy">
              <p>
                A startup, recognized by DPIIT, incorporated not more than 2 years ago at the time of application.
                The startup must have a business idea to develop a product or a service with a market fit, viable
                commercialization, and scope of scaling.
              </p>
            </div>

            <div className="seedfund-criteria-block border-red">
              <p>
                The startup should be using technology in its core product or service, or business model, or
                distribution model, or methodology to solve the problem being targeted. Preference would be given to
                startups creating innovative solutions in sectors such as social impact, waste management, water
                management, financial inclusion, education, agriculture, food processing, biotechnology, healthcare,
                energy, mobility, defence, space, railways, oil and gas, textiles, etc.
              </p>
            </div>

            <div className="seedfund-criteria-block border-navy">
              <p>
                The Startup should not have received more than Rs 10 lakh of monetary support under any other Central
                or State Government scheme. This does not include prize money from competitions and grand challenges,
                subsidized working space, founder monthly allowance, access to labs, or access to prototyping
                facilities.
              </p>
            </div>

            <div className="seedfund-criteria-block border-red">
              <p>
                A startup applicant can avail seed support in the form of grant or debt/convertible debentures each
                once as per the guidelines of the scheme.
              </p>
            </div>
          </div>

          {/* Card 3: Seed Fund Disbursement Options */}
          <div className="seedfund-card">
            <div className="seedfund-card-title">
              <span className="seedfund-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              <h3>Seed Fund Disbursement Options</h3>
            </div>

            <div className="disbursement-option-box option-grant">
              <h4>Option 1: Grant for Validation</h4>
              <p>
                Up to Rs. 20 Lakhs as grant for validation of Proof of Concept, or prototype development, or product
                trials. The grant shall be disbursed in milestone-based installments. These milestones can be related
                to development of prototype, product testing, building a product ready for market launch, etc.
              </p>
            </div>

            <div className="option-or-divider">OR</div>

            <div className="disbursement-option-box option-investment">
              <h4>Option 2: Investment for Market Entry</h4>
              <p>
                Up to Rs. 50 Lakhs of investment for market entry, commercialization, or scaling up through
                convertible debentures or debt or debt-linked instruments.
              </p>
            </div>

            <p className="disbursement-note">
              A startup applicant can avail seed support in the form of debt/convertible debentures each once as per
              the guidelines of the scheme.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="seedfund-right-col">
          {/* Right Card 1: Scope of Our Services */}
          <div className="seedfund-card">
            <h3 className="right-card-title">Scope of Our Services</h3>
            <ul className="seedfund-check-list">
              {scopeServices.map((svc, idx) => (
                <li key={idx} className="seedfund-check-item">
                  <span className="seedfund-check-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </span>
                  <span>{svc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Card 2: Timeline */}
          <div className="seedfund-card" style={{ marginTop: '20px' }}>
            <div className="timeline-card-header">
              <span className="timeline-clock-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <h3 className="right-card-title" style={{ margin: 0 }}>Timeline</h3>
            </div>

            <div className="seedfund-timeline-list">
              <div className="timeline-step-row">
                <span className="timeline-badge badge-navy">1</span>
                <div className="timeline-step-content">
                  <h4>Agreement from legal team</h4>
                  <p>Agreement will be shared within 48 working hours post proper booking parked in CRM</p>
                </div>
              </div>

              <div className="timeline-step-row">
                <span className="timeline-badge badge-red">2</span>
                <div className="timeline-step-content">
                  <h4>Documentation</h4>
                  <p>Seed funding team will connect within 1 Week after Agreement is received</p>
                </div>
              </div>

              <div className="timeline-step-row">
                <span className="timeline-badge badge-navy">3</span>
                <div className="timeline-step-content">
                  <h4>Pitch Deck & Financial Preparation</h4>
                  <p>Team will send documents within 1-2 Weeks after form submission</p>
                </div>
              </div>

              <div className="timeline-step-row">
                <span className="timeline-badge badge-red">4</span>
                <div className="timeline-step-content">
                  <h4>Application Submission</h4>
                  <p>Application will be submitted within 1 week after approval</p>
                </div>
              </div>
            </div>

            <div className="timeline-footer-disclaimers">
              <p>Above mentioned timeline may vary due to unavoidable circumstances.</p>
              <p>Final decision to granting the Fund will be done by incubators only.</p>
            </div>
          </div>

          {/* Right Card 3: Commercials */}
          <div className="seedfund-card" style={{ marginTop: '20px' }}>
            <h3 className="right-card-title">Commercials</h3>
            <div className="commercials-box">
              <div className="commercials-fee-label">Service Fee:</div>
              <div className="commercials-price">₹40,000/- + 18% GST</div>
              <div className="commercials-terms">
                <div className="term-item">
                  <span className="term-arrow">→</span>
                  <span>50% advance with documents (Non-refundable)</span>
                </div>
                <div className="term-item">
                  <span className="term-arrow">→</span>
                  <span>50% at the time of the EAC committee approval</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="seedfund-footer-note">
        <p>© 2026 ArthoVista Success Toolkit. All rights reserved.</p>
      </footer>
    </div>
  );
}
