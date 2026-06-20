import { useState } from "react";
import RefundsShell, { type PortalSectionId } from "../components/refunds-shell";
import Funds from "../components/portal-sections/funds";
import Trade from "../components/portal-sections/trade";
import VaultOverview from "../components/portal-sections/vault-overview";
import CaseIntake from "../components/portal-sections/case-intake";
import MyCases from "../components/portal-sections/my-cases";
import InvestigatorPanel from "../components/portal-sections/investigator-panel";
import BlockchainWidgets from "../components/portal-sections/blockchain-widgets";
import AiAssistant from "../components/portal-sections/ai-assistant";
import SecureMessaging from "../components/portal-sections/secure-messaging";
import EvidenceUpload from "../components/portal-sections/evidence-upload";
import RecoveryTimeline from "../components/portal-sections/recovery-timeline";
import { useTransactions } from "@/hooks/use-transactions";
import { useApprovalPoller } from "@/hooks/use-approval-poller";

const VALID_SECTIONS: PortalSectionId[] = [
  "wallet",
  "trade",
  "overview",
  "intake",
  "cases",
  "investigator",
  "chain",
  "ai",
  "messages",
  "evidence",
  "timeline",
];

function readHashSection(): PortalSectionId {
  if (typeof window === "undefined") return "wallet";
  const raw = window.location.hash.replace(/^#/, "") as PortalSectionId;
  return VALID_SECTIONS.includes(raw) ? raw : "wallet";
}

export default function RefundsPortal() {
  const [section, setSection] = useState<PortalSectionId>(() => readHashSection());

  // The unified wallet + recovery hub shares a single server-backed ledger.
  // The approval poller runs at the portal level (not per-section) so
  // admin-driven balance directives apply no matter which tab is open.
  const tx = useTransactions();
  useApprovalPoller(tx.transactions, tx.setTransactions);

  const handleChange = (next: PortalSectionId) => {
    setSection(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}#${next}`);
    }
  };

  return (
    <RefundsShell active={section} onSectionChange={handleChange}>
      {section === "wallet" && <Funds tx={tx} onTrade={() => handleChange("trade")} />}
      {section === "trade" && <Trade tx={tx} />}
      {section === "overview" && <VaultOverview />}
      {section === "intake" && <CaseIntake />}
      {section === "cases" && <MyCases />}
      {section === "investigator" && <InvestigatorPanel />}
      {section === "chain" && <BlockchainWidgets />}
      {section === "ai" && <AiAssistant />}
      {section === "messages" && <SecureMessaging />}
      {section === "evidence" && <EvidenceUpload />}
      {section === "timeline" && <RecoveryTimeline />}
    </RefundsShell>
  );
}
