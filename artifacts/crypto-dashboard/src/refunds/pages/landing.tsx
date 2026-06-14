import { MotionConfig } from "framer-motion";
import HomeNav from "../components/homepage/home-nav";
import HeroSection from "../components/homepage/hero-section";
import TrustIndicators from "../components/homepage/trust-indicators";
import RecoveryProcess from "../components/homepage/recovery-process";
import RecoveryCategories from "../components/homepage/recovery-categories";
import BlockchainIntelligence from "../components/homepage/blockchain-intelligence";
import SecureVault from "../components/homepage/secure-vault";
import AiAssistantSection from "../components/homepage/ai-assistant-section";
import CaseIntakeSection from "../components/homepage/case-intake-section";
import InvestigationOps from "../components/homepage/investigation-ops";
import ComplianceLegal from "../components/homepage/compliance-legal";
import DashboardPreview from "../components/homepage/dashboard-preview";
import RecoveryStats from "../components/homepage/recovery-stats";
import EducationSection from "../components/homepage/education-section";
import FaqSection from "../components/homepage/faq-section";
import FooterEcosystem from "../components/homepage/footer-ecosystem";

export default function RefundsLanding() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="refunds-scope min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 -z-10 refunds-radial" />
        <div className="absolute inset-0 -z-10 refunds-grid-bg opacity-50" />

        <HomeNav />

        <main>
          <HeroSection />
          <TrustIndicators />
          <RecoveryProcess />
          <RecoveryCategories />
          <BlockchainIntelligence />
          <SecureVault />
          <AiAssistantSection />
          <CaseIntakeSection />
          <InvestigationOps />
          <ComplianceLegal />
          <DashboardPreview />
          <RecoveryStats />
          <EducationSection />
          <FaqSection />
        </main>

        <FooterEcosystem />
      </div>
    </MotionConfig>
  );
}
