import Link from "next/link";
import {
  Building2,
  FileText,
  Search,
  Copy,
  ArrowRight,
  Shield,
  Zap,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Building2,
    title: "Vendor Visibility",
    description:
      "Centralize all vendor data. Upload spend CSV files, auto-normalize names with AI, and see every dollar across departments.",
  },
  {
    icon: FileText,
    title: "Contract Intelligence",
    description:
      "Upload contract PDFs and let AI extract renewal dates, auto-renew clauses, notice periods, and pricing escalation terms.",
  },
  {
    icon: Copy,
    title: "Duplicate Detection",
    description:
      "Embeddings-powered similarity analysis finds overlapping tools and flags consolidation opportunities to reduce waste.",
  },
  {
    icon: Search,
    title: "AI Search Assistant",
    description:
      'Ask natural questions like "Do we already use a CRM?" and get instant, cited answers from your vendor data.',
  },
];

const stats = [
  { label: "Average savings found", value: "23%", sublabel: "on duplicate tools" },
  { label: "Contracts analyzed", value: "<60s", sublabel: "per document" },
  { label: "Renewal alerts", value: "30/60/90", sublabel: "day advance notice" },
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Eye className="h-4 w-4" />
            AI-Powered Vendor Intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
            See everything.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Miss nothing.
            </span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            VendorLens AI gives your organization centralized visibility into vendors, contracts,
            renewals, and duplicate tools — so you stop overspending and start negotiating from
            strength.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="text-base px-8">
                Start Free <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="text-base px-8">
                See Features
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-slate-950">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
              <div className="text-slate-500 text-xs mt-0.5">{stat.sublabel}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything you need to manage vendor chaos
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              AI surfaces the insights. You make the decisions.
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

      {/* Trust */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-8 mb-12 flex-wrap">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">SOC 2 Ready Architecture</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Sub-second Search</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Eye className="h-5 w-5" />
              <span className="text-sm font-medium">Human-in-the-Loop</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Ready to see what you&apos;ve been missing?
          </h2>
          <Link href="/login">
            <Button size="lg" className="text-base px-10">
              Get Started Today <ArrowRight className="h-4 w-4 ml-1" />
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
