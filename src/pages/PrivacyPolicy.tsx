import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-primary tracking-wide">Privacy Policy</h1>
      </header>

      <div className="prose prose-sm text-foreground space-y-4">
        <p className="text-xs text-muted-foreground">Last updated: March 2026</p>

        <h2 className="text-base font-bold text-primary">1. Information We Collect</h2>
        <p className="text-sm text-foreground/80">
          When you create an account, we collect your <strong>email address</strong>, <strong>full name</strong>,
          and optionally your <strong>masjid name</strong>, <strong>city</strong>, and <strong>province</strong>.
        </p>
        <p className="text-sm text-foreground/80">
          When you enable push notifications, we collect your <strong>device token</strong> and <strong>device identifier</strong>
          to deliver prayer reminders.
        </p>
        <p className="text-sm text-foreground/80">
          When you use the Ibadah Chart, we store your <strong>daily prayer tracking data</strong> linked to your account.
        </p>

        <h2 className="text-base font-bold text-primary">2. How We Use Your Information</h2>
        <ul className="text-sm text-foreground/80 list-disc pl-5 space-y-1">
          <li>To provide personalized Ibadah tracking and prayer reminders</li>
          <li>To authenticate and secure your account</li>
          <li>To send prayer time notifications to your device</li>
          <li>To improve the application's functionality</li>
        </ul>

        <h2 className="text-base font-bold text-primary">3. Data Storage & Security</h2>
        <p className="text-sm text-foreground/80">
          Your data is stored securely using industry-standard encryption and access controls.
          We use Row Level Security (RLS) to ensure each user can only access their own data.
          All communication is encrypted via HTTPS.
        </p>

        <h2 className="text-base font-bold text-primary">4. Data Sharing</h2>
        <p className="text-sm text-foreground/80">
          We do <strong>not</strong> sell, trade, or share your personal data with third parties.
          Firebase Cloud Messaging is used solely for delivering push notifications.
        </p>

        <h2 className="text-base font-bold text-primary">5. Your Rights</h2>
        <ul className="text-sm text-foreground/80 list-disc pl-5 space-y-1">
          <li><strong>Access:</strong> You can view your profile data in the Settings page</li>
          <li><strong>Correction:</strong> You can update your profile information at any time</li>
          <li><strong>Deletion:</strong> You can delete your account and all associated data from the Settings page</li>
          <li><strong>Portability:</strong> Contact us to request an export of your data</li>
        </ul>

        <h2 className="text-base font-bold text-primary">6. Account Deletion</h2>
        <p className="text-sm text-foreground/80">
          You can permanently delete your account at any time from the Settings page.
          This will remove all your personal data, including your profile, Ibadah logs,
          and notification preferences.
        </p>

        <h2 className="text-base font-bold text-primary">7. Children's Privacy</h2>
        <p className="text-sm text-foreground/80">
          This application is not directed at children under 13. We do not knowingly collect
          personal information from children under 13.
        </p>

        <h2 className="text-base font-bold text-primary">8. Changes to This Policy</h2>
        <p className="text-sm text-foreground/80">
          We may update this privacy policy from time to time. Changes will be reflected on this page
          with an updated date.
        </p>

        <h2 className="text-base font-bold text-primary">9. Contact Us</h2>
        <p className="text-sm text-foreground/80">
          If you have any questions about this privacy policy, please contact us through the application.
        </p>
      </div>
    </div>
  );
}
