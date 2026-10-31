import Link from "next/link";
import {
  Building2,
  FileText,
  Search,
  Copy,
  ArrowRight,
  Upload,
  Eye,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Building2,
    title: "Vendor Visibility",
    description:
      "Upload a spend CSV and VendorLens normalizes vendor names with AI, deduplicates entries, and gives you one clean view of who you're paying.",
  },
  {
    icon: FileText,
    title: "Contract Intelligence",
    description:
      "Drop in a contract PDF. AI reads it and pulls out the renewal date, auto-renew clause, notice period, and price escalation terms without manual parsing.",
  },
  {
    icon: Copy,
    title: "Duplicate Detection",
    description:
      "Semantic similarity flags when two vendors do the same job. Useful when different teams buy tools independently without realizing the overlap.",
  },
  {
    icon: Search,
    title: "Ask Your Vendor Data",
    description:
      'Type a question like "Do we have a contract with Salesforce expiring this quarter?" and get a direct answer drawn from your actual contracts and vendor list.',
  },
];

const steps = [
  {
    icon: Upload,
    step: "1",
    title: "Import your vendors",
    description: "Upload a spend export CSV or add vendors manually. AI cleans up naming inconsistencies automatically.",
  },
  {
    icon: FileText,
    step: "2",
    title: "Attach contracts",
    description: "Upload PDFs for each vendor. Key terms are extracted and stored: renewal dates, notice windows, and pricing clauses.",
  },
  {
    icon: Bell,
    step: "3",
    title: "Stay ahead of renewals",
    description: "Get alerts before contracts auto-renew. See which vendors overlap, and come to renewal conversations with the full picture.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
              VL
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              VendorLens
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="h-screen flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Eye className="h-4 w-4" />
            AI-Powered Vendor Intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Know your vendors.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Own your contracts.
            </span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            VendorLens pulls your vendor relationships, contracts, and renewal dates into one
            place and uses AI to surface what actually matters before it&apos;s too late.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="text-base px-8">
                Get Started <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="text-base px-8">
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="min-h-screen flex items-center bg-slate-50 px-6 py-24">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Three steps from messy spreadsheets to full contract visibility.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {s.step}
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="min-h-screen flex items-center px-6 py-24">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">What VendorLens does</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Built around the actual pain points of managing software vendors at scale.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-5">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="min-h-screen flex items-center bg-slate-950 px-6">
        <div className="max-w-2xl mx-auto text-center w-full">
          <h2 className="text-3xl font-bold text-white mb-4">
            Give it a try
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Add your vendors, upload a contract or two, and see what the AI pulls out.
            No setup fee, no sales call.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-base px-10 bg-white text-slate-900 hover:bg-slate-100">
              Open VendorLens <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} VendorLens AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
