import React from 'react';

export default function DigitalMarketingView() {
  const whyChooseUsItems = [
    {
      title: 'Experienced Team',
      desc: 'Digital marketing experts with proven track record',
    },
    {
      title: 'Customized Strategies',
      desc: 'Tailored solutions for your specific business needs',
    },
    {
      title: 'Transparent Reporting',
      desc: 'Clear metrics and regular performance updates',
    },
    {
      title: 'Result-Driven',
      desc: 'Focus on ROI and measurable business growth',
    },
    {
      title: 'Comprehensive Services',
      desc: 'All digital marketing solutions under one roof',
    },
  ];

  return (
    <div className="dm-page-container">
      {/* Header Section */}
      <div className="dm-header-section">
        <h2 className="dm-main-title">Digital Marketing Services</h2>
        <p className="dm-header-desc">
          Boost your online presence and grow your business with our comprehensive digital marketing solutions. At
          Enego Group, we design customized strategies to help you reach your target audience, increase brand
          awareness, and drive conversions.
        </p>
      </div>

      {/* 2-Column Grid */}
      <div className="dm-content-grid">
        {/* Left Column */}
        <div className="dm-left-col">
          {/* Card 1: Our Digital Marketing Services */}
          <div className="dm-card">
            <div className="dm-card-title">
              <span className="dm-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <h3>Our Digital Marketing Services</h3>
            </div>

            <div className="dm-services-grid">
              {/* Service 1: SEO */}
              <div className="dm-service-box">
                <div className="dm-service-header">
                  <span className="dm-service-icon icon-navy">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                  <h4>Search Engine Optimization (SEO)</h4>
                </div>
                <p className="dm-service-sub">Improve your website's visibility in search engine results and drive organic traffic</p>
                <ul className="dm-check-list">
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>On-page & Off-page optimization</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Keyword research & targeting</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Performance tracking & reporting</span>
                  </li>
                </ul>
              </div>

              {/* Service 2: PPC */}
              <div className="dm-service-box">
                <div className="dm-service-header">
                  <span className="dm-service-icon icon-red">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </span>
                  <h4>Pay-Per-Click (PPC) Advertising</h4>
                </div>
                <p className="dm-service-sub">Drive targeted traffic and leads with strategic paid advertising campaigns</p>
                <ul className="dm-check-list">
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Google Ads & Bing Ads management</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Ad copywriting & creative design</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Conversion tracking & optimization</span>
                  </li>
                </ul>
              </div>

              {/* Service 3: Social Media Marketing */}
              <div className="dm-service-box">
                <div className="dm-service-header">
                  <span className="dm-service-icon icon-navy">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </span>
                  <h4>Social Media Marketing</h4>
                </div>
                <p className="dm-service-sub">Build brand awareness and engage with your audience across social platforms</p>
                <ul className="dm-check-list">
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Platform strategy & content creation</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Community management & engagement</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Social media advertising</span>
                  </li>
                </ul>
              </div>

              {/* Service 4: WhatsApp Marketing */}
              <div className="dm-service-box">
                <div className="dm-service-header">
                  <span className="dm-service-icon icon-red">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </span>
                  <h4>WhatsApp Marketing</h4>
                </div>
                <p className="dm-service-sub">Connect directly with your customers via WhatsApp Business solutions</p>
                <ul className="dm-check-list">
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>WhatsApp Business API setup</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Campaign management & automation</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>WhatsApp Green Tick verification</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 2: WhatsApp Green Tick Verification */}
          <div className="dm-card" style={{ marginTop: '20px' }}>
            <div className="dm-card-title">
              <span className="dm-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <h3>WhatsApp Green Tick Verification</h3>
            </div>

            <div className="green-tick-body">
              <div className="green-tick-badge-wrapper">
                <div className="green-tick-circle">
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
              </div>

              <div className="green-tick-content">
                <p className="green-tick-desc">
                  Establish trust and credibility with the official WhatsApp Green Tick verification. This badge
                  confirms your business's authenticity to customers, enhancing your professional image and
                  boosting customer confidence.
                </p>
                <ul className="dm-check-list">
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Complete verification process management</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>Documentation & application assistance</span>
                  </li>
                  <li className="dm-check-item">
                    <span className="dm-check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span>WhatsApp Business API integration</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 3: Our Digital Marketing Process */}
          <div className="dm-card" style={{ marginTop: '20px' }}>
            <div className="dm-card-title">
              <span className="dm-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <h3>Our Digital Marketing Process</h3>
            </div>

            <div className="dm-process-list">
              {/* Step 1 */}
              <div className="dm-process-item">
                <span className="dm-process-badge badge-navy">1</span>
                <div className="dm-process-text">
                  <h5>Discovery & Analysis</h5>
                  <p>We assess your current digital presence, analyze competitors, and identify opportunities for growth.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="dm-process-item">
                <span className="dm-process-badge badge-red">2</span>
                <div className="dm-process-text">
                  <h5>Strategy Development</h5>
                  <p>We create a customized digital marketing plan aligned with your business goals and target audience.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="dm-process-item">
                <span className="dm-process-badge badge-navy">3</span>
                <div className="dm-process-text">
                  <h5>Implementation</h5>
                  <p>Our team executes the strategies across selected channels, creating compelling content and campaigns.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="dm-process-item">
                <span className="dm-process-badge badge-red">4</span>
                <div className="dm-process-text">
                  <h5>Monitoring & Optimization</h5>
                  <p>We continuously track performance, make data-driven adjustments, and optimize for better results.</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="dm-process-item">
                <span className="dm-process-badge badge-navy">5</span>
                <div className="dm-process-text">
                  <h5>Reporting & Analysis</h5>
                  <p>Regular comprehensive reports show campaign performance, ROI, and insights for future strategy.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dm-right-col">
          {/* Card 1: Our Portfolio */}
          <div className="dm-card">
            <h3 className="right-card-title">Our Portfolio</h3>
            <p className="dm-portfolio-desc">
              Explore our work and see how we've helped businesses transform their digital presence and achieve
              measurable results.
            </p>

            <div className="dm-portfolio-links-stack">
              <a
                href="https://drive.google.com/file/d/1ojtRKM9yb2f0_pNa02F-Zwuqm_WBWDoR/view"
                target="_blank"
                rel="noreferrer"
                className="portfolio-btn btn-slate"
              >
                <span className="portfolio-btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
                <span>Digital Marketing Portfolio</span>
              </a>

              <a
                href="https://drive.google.com/drive/folders/1iyNUrOtRbxGnwET6JHzJlFSMO74yjYjG"
                target="_blank"
                rel="noreferrer"
                className="portfolio-btn btn-rose"
              >
                <span className="portfolio-btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
                <span>WhatsApp Marketing Portfolio</span>
              </a>

              <a
                href="https://drive.google.com/drive/folders/1jbglLVhJ6aACpHgDfLT9DBYwYs_QHUap"
                target="_blank"
                rel="noreferrer"
                className="portfolio-btn btn-slate"
              >
                <span className="portfolio-btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
                <span>WhatsApp Green Tick Portfolio</span>
              </a>

              <a
                href="https://www.behance.net/Enego/projects"
                target="_blank"
                rel="noreferrer"
                className="portfolio-btn btn-rose"
              >
                <span className="portfolio-btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </span>
                <span>Behance Portfolio</span>
              </a>
            </div>
          </div>

          {/* Card 2: Why Choose Us? */}
          <div className="dm-card" style={{ marginTop: '20px' }}>
            <h3 className="right-card-title">Why Choose Us?</h3>
            <ul className="why-choose-list">
              {whyChooseUsItems.map((item, idx) => (
                <li key={idx} className="why-choose-item">
                  <span className="why-choose-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </span>
                  <div className="why-choose-text">
                    <strong>{item.title}:</strong> {item.desc}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3: Refer a Lead */}
          <div className="dm-card" style={{ marginTop: '20px' }}>
            <h3 className="right-card-title">Refer a Lead</h3>
            <p className="refer-lead-desc">
              Have a potential client who could benefit from our digital marketing services? Fill out our lead referral
              form.
            </p>
            <a
              href="https://docs.google.com/forms/d/1kpvjMeerzjcwwoJGonG2xCmDOMFlgOqY1mdj3iuMSCQ/edit"
              target="_blank"
              rel="noreferrer"
              className="btn-submit-referral"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Submit Lead Referral</span>
            </a>
            <div className="referral-status-wrap">
              <a
                href="#lead-status"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Referral status tracker: Contact your Enego representative for real-time lead updates.');
                }}
                className="referral-status-link"
              >
                Check lead status
              </a>
            </div>
          </div>
        </div>
      </div>

      <footer className="dm-footer-note">
        <p>© 2026 ArthoVista Success Toolkit. All rights reserved.</p>
      </footer>
    </div>
  );
}
