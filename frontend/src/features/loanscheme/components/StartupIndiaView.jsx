import React from 'react';

export default function StartupIndiaView() {
  const ourServices = [
    { name: 'START-UP INDIA CERTIFICATE', type: 'blue' },
    { name: 'INCOME TAX EXEMPTION', type: 'rose' },
    { name: 'SEED FUNDING APPLICATION', type: 'blue' },
    { name: 'ISO CERTIFICATE', type: 'rose' },
    { name: 'UDYAM CERTIFICATE', type: 'blue' },
    { name: 'GeM REGISTRATION', type: 'rose' },
    { name: 'TReDS REGISTRATION', type: 'blue' },
    { name: 'NSIC CERTIFICATION', type: 'rose' },
    { name: 'ZED CERTIFICATION', type: 'blue' },
    { name: 'MSME & STARTUP LOANS', type: 'rose' },
  ];

  return (
    <div className="startup-page-container">
      <div className="startup-header-section">
        <h2 className="startup-main-title">Startup India Benefits & Schemes</h2>
        <p className="startup-header-desc">
          Startup India is a flagship initiative of the Government of India, intended to build a strong
          ecosystem that is conducive for the growth of startup businesses, to drive sustainable economic growth
          and generate large scale employment opportunities.
        </p>
      </div>

      <div className="startup-content-grid">
        {/* Left Column: Key Benefits */}
        <div className="startup-left-col">
          <div className="startup-card key-benefits-card">
            <div className="startup-card-title">
              <span className="card-title-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <h3>Key Benefits</h3>
            </div>

            <div className="benefit-item border-navy">
              <h4 className="benefit-item-title">1. FUNDING SUPPORT</h4>
              <p className="benefit-item-desc">
                Start Up India Seed Funding, Govt. Grant Benefits, Crowd Funding, Angel Funding, Venture Capital, Govt.
                Funds, Business Incubators & Accelerators Funding.
              </p>
            </div>

            <div className="benefit-item border-red">
              <h4 className="benefit-item-title">2. Tax Exemption under 80IAC</h4>
              <p className="benefit-item-desc">
                Eligible start-ups can be exempted from paying income tax for 3 consecutive financial years out of their
                first ten years since incorporation.
              </p>
            </div>

            <div className="benefit-item border-navy">
              <h4 className="benefit-item-title">3. Easier Public Procurement Norms</h4>
              <div className="benefit-subitem">
                <p className="benefit-item-desc">
                  <strong>Exemption from Prior Experience/Turnover:</strong> The Government exempts Start-ups in the
                  manufacturing sector from the criteria of "prior experience/turnover" without compromising on quality
                  standards or technical parameters.
                </p>
                <p className="benefit-item-desc" style={{ marginTop: '10px' }}>
                  <strong>EMD Exemption:</strong> DPIIT recognized start-ups have been exempted from submitting Earnest
                  Money Deposit (EMD) or bid security while filling government tenders.
                </p>
              </div>
            </div>

            <div className="benefit-item border-red">
              <h4 className="benefit-item-title">4. Self-Certification in Labour & Environmental Laws</h4>
              <p className="benefit-item-desc">
                Start-ups shall be allowed to self-certify compliance for 9 Labour Laws and 3 Environmental Laws through
                a simple online procedure. No inspections will be conducted for a period of 5 years for labour laws.
              </p>
            </div>

            <div className="benefit-item border-navy">
              <h4 className="benefit-item-title">5. Startup Patent Application & IPR Application</h4>
              <p className="benefit-item-desc">
                Fast-tracking of Startup Patent Applications and 80% rebate in filing patents. The government bears the
                entire fees of the facilitators for any number of patents, trademarks or designs that a Startup may file.
              </p>
            </div>

            <div className="benefit-item border-red">
              <h4 className="benefit-item-title">6. Partnered Services</h4>
              <p className="benefit-item-desc">
                Startup India has partnered with various corporate and organizations to provide free services for your
                startup and help you accelerate your growth.
              </p>
              <div className="partnered-services-grid">
                <div className="partner-service-cell">
                  <strong>Cloud Services:</strong> Amazon Web services, Digital Ocean, Caller Desk
                </div>
                <div className="partner-service-cell">
                  <strong>Management Software:</strong> ZOHO, Freshworks, Stackby
                </div>
                <div className="partner-service-cell">
                  <strong>Legal Support:</strong> Vakilsearch, Lawyered, Lexstart
                </div>
                <div className="partner-service-cell">
                  <strong>Financial Services:</strong> RBI, Gimbooks, Intuit
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Eligibility, Services & Fee */}
        <div className="startup-right-col">
          {/* Eligibility Card */}
          <div className="startup-card eligibility-card">
            <h3 className="right-card-title">Eligibility Criteria</h3>
            <ul className="criteria-list">
              <li className="criteria-item">
                <span className="criteria-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <div className="criteria-text">
                  <strong>Company Age:</strong> Period of existence and operations should not be exceeding 10 years from the Date of Incorporation
                </div>
              </li>

              <li className="criteria-item">
                <span className="criteria-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <div className="criteria-text">
                  <strong>Company Type:</strong> Incorporated as a Private Limited Company, a Registered Partnership Firm or a Limited Liability Partnership
                </div>
              </li>

              <li className="criteria-item">
                <span className="criteria-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <div className="criteria-text">
                  <strong>Annual Turnover:</strong> Should have an annual turnover not exceeding Rs. 100 crore for any of the financial years since its Incorporation
                </div>
              </li>

              <li className="criteria-item">
                <span className="criteria-check-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <div className="criteria-text">
                  <strong>Original Entity:</strong> Entity should not have been formed by splitting up or reconstructing an already existing business
                </div>
              </li>
            </ul>
          </div>

          {/* Our Services Card */}
          <div className="startup-card services-card">
            <h3 className="right-card-title">Our Services</h3>
            <div className="services-pills-wrap">
              {ourServices.map((svc, idx) => (
                <span key={idx} className={`service-pill pill-${svc.type}`}>
                  {svc.name}
                </span>
              ))}
            </div>

            {/* Service Fee Box */}
            <div className="service-fee-box">
              <div className="fee-box-header">
                <span className="fee-info-icon">ⓘ</span>
                <h4>Service Fee</h4>
              </div>
              <p className="fee-price-text">
                For this service we will charge you <strong>₹15,000 + 18% GST</strong>
              </p>
              <p className="fee-refund-text">
                If in case, we are unable to deliver you the certificate of recognition, we will refund you the amount paid.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="startup-footer-note">
        <p>© 2026 ArthoVista Success Toolkit. All rights reserved.</p>
      </footer>
    </div>
  );
}
