import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SettingsPageContent from '@/components/settings/SettingsPageContent';
import { SidebarProvider } from '@/context/SidebarContext';

export default function SettingsPage() {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <h1 className="page-title">Settings</h1>
            <p className="mt-2 text-text-secondary">
              Manage your account, profile, privacy, and notification preferences.
            </p>
            <SettingsPageContent />
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
