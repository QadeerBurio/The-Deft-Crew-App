// app/src/components/Disclaimer.js — Disclaimer (drawer). Wording unchanged; design system layout.
import React from "react";
import { DocScreen, DocHero, DocSection, DocCard, DocNote, DocFooter } from "../ui/DocPage";

const disclaimers = [
  {
    icon: "store-remove-outline",
    title: "Offer & Discount",
    content: "tdc connects students and brands. Brands are responsible for their offers, availability and quality.",
  },
  {
    icon: "briefcase-variant-outline",
    title: "Jobs & Internships",
    content: "We don't guarantee jobs or the accuracy of listings posted by recruiters.",
  },
  {
    icon: "airplane-off",
    title: "AI Travel & Global Programs",
    content: "Travel plans are AI suggestions only. tdc doesn't book travel and isn't responsible for visa rejections, delays or changes to exchange policies.",
  },
  {
    icon: "clipboard-check-outline",
    title: "Status Verification",
    content: "Keep your student credentials valid. tdc may change your access if they aren't.",
  },
  {
    icon: "information-outline",
    title: "Informational Scope",
    content: "tdc is provided 'as is.' We do not warrant that the app will be error-free or rewards redeemable at all times.",
  },
];

export default function DisclaimerScreen() {
  return (
    <DocScreen title="Disclaimer">
      <DocHero kicker="LEGAL NOTICE" title="Before You Use tdc" line="What tdc is and isn't responsible for." />
      <DocNote icon="alert-outline" text="Here's what tdc covers and what it doesn't." />

      <DocSection title="Legal Exclusions" />
      {disclaimers.map((d) => (
        <DocCard key={d.title} icon={d.icon} title={d.title} body={d.content} />
      ))}

      <DocFooter lines={["© 2026 The Deft Crew. All Rights Reserved."]} />
    </DocScreen>
  );
}
