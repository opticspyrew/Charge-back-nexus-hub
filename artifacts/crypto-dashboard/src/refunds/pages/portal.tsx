import { useState } from "react";
import RefundsShell, { type PortalSectionId } from "../components/refunds-shell";
import VaultOverview from "../components/portal-sections/vault-overview";
import CaseIntake from "../components/portal-sections/case-intake";
import InvestigatorPanel from "../components/portal-sections/investigator-panel";
import BlockchainWidgets from "../components/portal-sections/blockchain-widgets";
import AiAssistant from "../components/portal-sections/ai-assistant";
import SecureMessaging from "../components/portal-sections/secure-messaging";
import EvidenceUpload from "../components/portal-sections/evidence-upload";
import RecoveryTimeline from "../components/portal-sections/recovery-timeline";

const VALID_SECTIONS: PortalSectionId[] = [
  "overview",
  "intake",
  "investigator",
  "chain",
  "ai",
  "messages",
  "evidence",
  "timeline",
];

function readHashSection(): PortalSectionId {
  if (typeof window === "undefined") return "overview";
  const raw = window.location.hash.replace(/^#/, "") as PortalSectionId;
  return VALID_SECTIONS.includes(raw) ? raw : "overview";
}

export default function RefundsPortal() {
  const [section, setSection] = useState<PortalSectionId>(() => readHashSection());

  const handleChange = (next: PortalSectionId) => {
    setSection(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}#${next}`);
    }
  };

  return (
    <RefundsShell active={section} onSectionChange={handleChange}>
      {section === "overview" && <VaultOverview />}
      {section === "intake" && <CaseIntake />}
      {section === "investigator" && <InvestigatorPanel />}
      {section === "chain" && <BlockchainWidgets />}
      {section === "ai" && <AiAssistant />}
      {section === "messages" && <SecureMessaging />}
      {section === "evidence" && <EvidenceUpload />}
      {section === "timeline" && <RecoveryTimeline />}
    </RefundsShell>
  );
}
