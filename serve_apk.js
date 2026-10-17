const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8088;
const apkPath = path.resolve(__dirname, 'ArthoVista-CRM-Sync-v1.0.1-FIXED.apk');
const ipaPath = path.resolve(__dirname, 'ArthoVistaCRMSync.ipa');

const server = http.createServer((req, res) => {
    // 1. Android APK Download Endpoint
    if (req.url === '/download' || req.url === '/apk' || req.url === '/download/android') {
        if (!fs.existsSync(apkPath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Android APK not found on server.');
        }
        const stat = fs.statSync(apkPath);
        res.writeHead(200, {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Length': stat.size,
            'Content-Disposition': 'attachment; filename="ArthoVista-CRM-Sync-v1.0.1-FIXED.apk"'
        });
        const readStream = fs.createReadStream(apkPath);
        readStream.pipe(res);
        return;
    }

    // 2. iOS IPA Download Endpoint
    if (req.url === '/ipa' || req.url === '/download/ios') {
        if (!fs.existsSync(ipaPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>iOS Companion Build Options</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #fff; text-align: center; padding: 40px 20px; }
                        .card { background: #1e293b; border-radius: 20px; padding: 28px; max-width: 520px; margin: 0 auto; box-shadow: 0 15px 35px rgba(0,0,0,0.5); text-align: left; }
                        h1 { font-size: 22px; color: #38bdf8; margin-top: 0; }
                        .step { background: #0f172a; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
                        .step-title { font-weight: bold; font-size: 14px; color: #10b981; margin-bottom: 4px; }
                        .step-desc { font-size: 13px; color: #94a3b8; line-height: 1.4; }
                        .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 10px; }
                        .badge { display: inline-block; background: #6366f1; color: white; font-size: 11px; padding: 4px 8px; border-radius: 6px; margin-bottom: 12px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <span class="badge">iOS Companion Package</span>
                        <h1>📱 Artho Vista CRM for iOS</h1>
                        <p style="color: #94a3b8; font-size: 13px;">Choose how you want to run the companion on your iPhone:</p>
                        
                        <div class="step">
                            <div class="step-title">Option 1: Open in Xcode (Mac)</div>
                            <div class="step-desc">Open the <code>ios-sim-sync/ArthoVistaCRMSync.xcodeproj</code> project in Xcode on Mac and click Run to install directly onto your connected iPhone.</div>
                        </div>

                        <div class="step">
                            <div class="step-title">Option 2: Cloud CI/CD (GitHub Actions)</div>
                            <div class="step-desc">Run the <code>.github/workflows/ios-build.yml</code> workflow in GitHub Actions to automatically download the compiled <code>ArthoVistaCRMSync.ipa</code>.</div>
                        </div>

                        <div class="step">
                            <div class="step-title">Option 3: Sideload IPA via Sideloadly / AltStore</div>
                            <div class="step-desc">Once built, drag and drop the IPA file into Sideloadly (Windows/Mac) to install onto your iPhone in seconds.</div>
                        </div>

                        <a href="/" class="btn" style="background: #334155; margin-right: 8px;">← Back to Portal</a>
                        <a href="https://sideloadly.io" target="_blank" class="btn">Get Sideloadly ↗</a>
                    </div>
                </body>
                </html>
            `);
        }
        const stat = fs.statSync(ipaPath);
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': stat.size,
            'Content-Disposition': 'attachment; filename="ArthoVistaCRMSync.ipa"'
        });
        const readStream = fs.createReadStream(ipaPath);
        readStream.pipe(res);
        return;
    }

    // 3. Multi-Platform Portal Landing Page
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Artho Vista CRM — Mobile Apps Download</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background: linear-gradient(135deg, #0b0f19 0%, #1e293b 100%);
                    color: #f8fafc;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                }
                .container {
                    max-width: 680px;
                    width: 100%;
                }
                .header {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .logo-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 64px;
                    height: 64px;
                    border-radius: 20px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
                    margin-bottom: 16px;
                    font-size: 30px;
                }
                h1 {
                    font-size: 26px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                    margin-bottom: 8px;
                    background: linear-gradient(to right, #ffffff, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .subtitle {
                    color: #94a3b8;
                    font-size: 14px;
                }
                .badge-bar {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 12px;
                }
                .tag {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    padding: 4px 10px;
                    border-radius: 20px;
                }
                .tag-green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
                .tag-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }

                .grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                @media (max-width: 600px) {
                    .grid { grid-template-columns: 1fr; }
                }

                .card {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 24px;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    transition: transform 0.2s ease, border-color 0.2s ease;
                }
                .card:hover {
                    transform: translateY(-4px);
                    border-color: #475569;
                }
                .platform-icon {
                    font-size: 32px;
                    margin-bottom: 12px;
                }
                .card-title {
                    font-size: 18px;
                    font-weight: 800;
                    margin-bottom: 6px;
                }
                .card-desc {
                    font-size: 13px;
                    color: #94a3b8;
                    line-height: 1.4;
                    margin-bottom: 20px;
                }
                .features-list {
                    list-style: none;
                    margin-bottom: 24px;
                    font-size: 12px;
                    color: #cbd5e1;
                }
                .features-list li {
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 14px 20px;
                    border-radius: 14px;
                    font-size: 14px;
                    font-weight: 800;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }
                .btn-android {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
                }
                .btn-android:hover {
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5);
                }
                .btn-ios {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
                }
                .btn-ios:hover {
                    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5);
                }

                .footer {
                    margin-top: 28px;
                    text-align: center;
                    font-size: 12px;
                    color: #64748b;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo-badge">📞</div>
                    <h1>Artho Vista CRM Mobile Sync</h1>
                    <p class="subtitle">Zero-cost native mobile companions for sales representatives</p>
                    <div class="badge-bar">
                        <span class="tag tag-green">₹0 Cloud Telephony Fees</span>
                        <span class="tag tag-blue">v1.0.1 Live</span>
                    </div>
                </div>

                <div class="grid">
                    <!-- Android Card -->
                    <div class="card">
                        <div>
                            <div class="platform-icon">🤖</div>
                            <div class="card-title">Android Companion</div>
                            <div class="card-desc">Automatic SIM call recording, duration tracking, and CRM lead association for Android phones.</div>
                            <ul class="features-list">
                                <li>✅ Background Call Logger</li>
                                <li>✅ Dual-SIM slot detection</li>
                                <li>✅ Offline resilient queue</li>
                            </ul>
                        </div>
                        <a href="/download/android" class="btn btn-android">
                            <span>⬇️</span>
                            <span>Download Android APK</span>
                        </a>
                    </div>

                    <!-- iOS Card -->
                    <div class="card">
                        <div>
                            <div class="platform-icon">🍏</div>
                            <div class="card-title">iOS Companion</div>
                            <div class="card-desc">Apple CallKit enabled companion with 1-tap CRM dialer and post-call automatic sync for iPhones.</div>
                            <ul class="features-list">
                                <li>✅ Apple CallKit CXCallObserver</li>
                                <li>✅ 1-Tap CRM Lead Calling</li>
                                <li>✅ Post-Call Quick Note popup</li>
                            </ul>
                        </div>
                        <a href="/ipa" class="btn btn-ios">
                            <span>🍎</span>
                            <span>Get iOS Companion / IPA</span>
                        </a>
                    </div>
                </div>

                <div class="footer">
                    Artho Vista CRM • Real-time Mobile SIM Synchronization
                </div>
            </div>
        </body>
        </html>
    `);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Mobile App Distribution Server running at http://0.0.0.0:${PORT}`);
});
