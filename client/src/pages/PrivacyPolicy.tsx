import { FC } from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: FC = () => {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link to="/" className="text-accent-600 hover:text-accent-700 font-medium text-sm mb-6 inline-block">
            ← Back to Login
          </Link>
          <h1 className="text-4xl font-bold text-text-primary mb-3">Privacy Policy</h1>
          <p className="text-text-secondary">Last updated: August 8, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Introduction</h2>
            <p className="text-text-secondary leading-relaxed">
              Methynix Software ("we," "us," "our," or "Company") operates the ledgerHQ application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service and the choices you have associated with that data.
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Personal Identification Information</h3>
                <p className="text-text-secondary">
                  When you register for an account or use the service, we collect: email address, name, password (encrypted), phone number, and role/position information.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Financial Data</h3>
                <p className="text-text-secondary">
                  We collect transaction data, expense records, account information, and financial reports that you input into the system. This data is encrypted and stored securely.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Usage Data</h3>
                <p className="text-text-secondary">
                  We collect information about how you interact with the service, including login times, features accessed, and API calls made. This helps us improve the service.
                </p>
              </div>
            </div>
          </section>

          {/* Data Usage */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">How We Use Your Information</h2>
            <ul className="text-text-secondary space-y-3 list-disc list-inside">
              <li>To provide and maintain the service</li>
              <li>To send administrative information and updates</li>
              <li>To respond to your inquiries and support requests</li>
              <li>To monitor and analyze usage patterns (for security and improvement)</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Security of Your Data</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.
            </p>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-sm text-text-secondary">
              <p className="font-semibold text-text-primary mb-2">Security Measures Include:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>HTTPS encryption for all data in transit</li>
                <li>Bcrypt password hashing (salt 12)</li>
                <li>CSRF token validation on state-changing operations</li>
                <li>JWT tokens with short expiry (15 minutes)</li>
                <li>Rate limiting on sensitive endpoints</li>
              </ul>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Data Retention</h2>
            <p className="text-text-secondary leading-relaxed">
              We retain your personal data for as long as necessary to provide our service. Financial records are retained according to legal requirements. You can request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          {/* Third Parties */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Third Party Access</h2>
            <p className="text-text-secondary leading-relaxed">
              We do not sell, trade, or rent your personal identification information to third parties. We do not disclose financial data except when required by law or with your explicit consent.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Your Privacy Rights</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="text-text-secondary space-y-2 list-disc list-inside">
              <li>Right to access your personal data</li>
              <li>Right to correct inaccurate data</li>
              <li>Right to request deletion of your data</li>
              <li>Right to restrict processing of your data</li>
              <li>Right to data portability</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Contact Us</h2>
            <div className="bg-accent-50 border border-accent-200 rounded-lg p-6 space-y-3">
              <p className="text-text-secondary">
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="space-y-2 text-text-primary font-medium">
                <p><strong>Methynix Software</strong></p>
                <p><a href="mailto:info@methynix.com" className="text-accent-600 hover:text-accent-700">info@methynix.com</a></p>
                <p><a href="tel:0715455422" className="text-accent-600 hover:text-accent-700">0715455422</a></p>
                <p><a href="https://www.methynix.com" target="_blank" rel="noopener noreferrer" className="text-accent-600 hover:text-accent-700">www.methynix.com</a></p>
              </div>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Changes to This Policy</h2>
            <p className="text-text-secondary">
              We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date of this Policy. Your continued use of the service following the posting of revised Privacy Policy means that you accept and agree to the changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
