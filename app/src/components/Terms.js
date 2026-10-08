// app/src/components/Terms.js — Terms of Service (drawer). Wording unchanged; design system layout.
import React from "react";
import { DocScreen, DocHero, DocSection, DocCard, DocFooter } from "../ui/DocPage";

const terms = [
  {
    icon: "account-check-outline",
    title: "Student Eligibility",
    content: "tdc is only for verified university students & alumni. You'll need valid student credentials.",
  },
  {
    icon: "briefcase-search-outline",
    title: "Career & Internships",
    content: "We connect you with employers. We can't guarantee you a job.",
  },
  {
    icon: "airplane-takeoff",
    title: "AI Travel & Exchange",
    content: "Travel suggestions are AI-generated. Check prices, bookings and visa rules before you go.",
  },
  {
    icon: "tag-text-outline",
    title: "Brand Redemption",
    content: "Deals depend on the brand. tdc isn't responsible for their service.",
  },
  {
    icon: "shield-key-outline",
    title: "Account Integrity",
    content: "Sharing your account with non-verfied user can get it permanently banned.",
  },
  {
    icon: "gavel",
    title: "Governing Law",
    content: "These terms follow Pakistani law. Disputes go to Pakistani courts",
  },
];

export default function TermsScreen() {
  return (
    <DocScreen title="Terms of Service">
      <DocHero
        kicker="Updated March 2026"
        title="The Rules"
        line="By using tdc, you agree to these terms. Here's the short version."
      />
      <DocSection title="Terms & Conditions" />
      {terms.map((t) => (
        <DocCard key={t.title} icon={t.icon} title={t.title} body={t.content} />
      ))}
      <DocFooter lines={["Building a Stronger Student Economy.", "© 2026 tdc Privilege Program"]} />
    </DocScreen>
  );
}
