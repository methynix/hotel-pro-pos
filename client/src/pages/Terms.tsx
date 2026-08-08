import { FC } from 'react';
import { Link } from 'react-router-dom';

const Terms: FC = () => {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link to="/" className="text-accent-600 hover:text-accent-700 font-medium text-sm mb-6 inline-block">
            ← Back to Login
          </Link>
          <h1 className="text-4xl font-bold text-text-primary mb-3">Terms of Service</h1>
          <p className="text-text-secondary">Last updated: August 8, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-8 space-y-8">
          {/* Agreement */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Terms of Agreement</h2>
            <p className="text-text-secondary leading-relaxed">
              By accessing and using the ledgerHQ application ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          {/* License */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">License to Use</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Methynix Software grants you a limited, non-exclusive, non-transferable license to use the Service for your personal or business financial management purposes, subject to these terms and conditions.
            </p>
            <p className="text-text-secondary leading-relaxed">
              You agree not to: modify, copy, or prepare derivative works based upon the Service; reverse engineer, disassemble, or decompile the Service; rent, lease, or lend the Service; or use the Service for any illegal or unauthorized purpose.
            </p>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">User Responsibilities</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="text-text-secondary space-y-3 list-disc list-inside">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
              <li>The accuracy of all information you provide</li>
              <li>Compliance with all applicable laws and regulations</li>
            </ul>
          </section>

          {/* Data Ownership */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Data Ownership</h2>
            <p className="text-text-secondary leading-relaxed">
              You retain full ownership of all financial data, records, and information you input into the Service. We serve as a custodian of this data and do not claim ownership rights. However, you grant us the license to store, process, and backup this data to provide the Service.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Acceptable Use Policy</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              You agree not to use the Service for any of the following purposes:
            </p>
            <ul className="text-text-secondary space-y-2 list-disc list-inside">
              <li>Any illegal or unauthorized purpose</li>
              <li>Harassing or causing distress or inconvenience to any person</li>
              <li>Obscene or offensive material</li>
              <li>Disrupting the normal flow of dialogue within our Service</li>
              <li>Attempting to gain unauthorized access to our systems</li>
              <li>Introducing viruses, worms, malware, or any malicious code</li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Disclaimer of Warranties</h2>
            <p className="text-text-secondary leading-relaxed">
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Methynix Software makes no warranties, expressed or implied, regarding the Service. To the fullest extent permissible pursuant to applicable law, Methynix Software disclaims all warranties, expressed or implied, including but not limited to implied warranties of merchantability and fitness for a particular purpose.
            </p>
          </section>

          {/* Limitations */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Limitation of Liability</h2>
            <p className="text-text-secondary leading-relaxed">
              In no event shall Methynix Software be liable for any damages (including, without limitation, direct, indirect, incidental, special, or consequential damages, or damages for loss of data, profits, or use) arising out of or in connection with the use or inability to use the Service, even if Methynix Software has been advised of the possibility of such damages.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Indemnification</h2>
            <p className="text-text-secondary leading-relaxed">
              You agree to indemnify and hold harmless Methynix Software from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or in connection with your use of the Service or violation of these Terms.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Termination</h2>
            <p className="text-text-secondary leading-relaxed">
              Methynix Software may terminate your account and access to the Service at any time, for any reason, with or without notice. Upon termination, your right to use the Service will immediately cease. We will provide you with a reasonable period to download your data before deletion.
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Modifications to Service</h2>
            <p className="text-text-secondary leading-relaxed">
              Methynix Software reserves the right to modify or discontinue the Service at any time, with or without notice to you. We shall not be liable to you or any third-party for any modification, suspension, or discontinuance of the Service.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Governing Law</h2>
            <p className="text-text-secondary leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws applicable in your jurisdiction, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Contact Information</h2>
            <div className="bg-accent-50 border border-accent-200 rounded-lg p-6 space-y-3">
              <p className="text-text-secondary">
                If you have any questions about these Terms of Service, please contact us:
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
            <h2 className="text-2xl font-bold text-text-primary mb-4">Changes to Terms</h2>
            <p className="text-text-secondary">
              Methynix Software reserves the right to modify these Terms at any time. Your continued use of the Service following the posting of revised Terms means you accept and agree to the changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
