import type { Metadata } from "next";
import CandidateWorkspace from "../../components/experience/CandidateWorkspace";

export const metadata: Metadata = {
  title: "Candidate Experience Preview | RemoteBPO Hub",
  description: "Demo of candidate job discovery, profile, typing test, companies, and notifications.",
  robots: { index: false, follow: false },
};

export default function MeghaWorkspacePage() {
  return <CandidateWorkspace />;
}
