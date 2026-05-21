import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, ClipboardList, FileArchive, FileCheck, FileText, MessageCircle, Search, ShieldCheck, Truck } from 'lucide-react';
import { useAuthStore } from '../auth/authStore.js';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const cards = getCards(user?.usertype);

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="hero-band">
        <p className="text-sm font-normal text-interpath-blue">Interpath workspace</p>
        <h2 className="mt-2 max-w-xl text-2xl font-normal leading-tight sm:text-3xl">Welcome back, ready to continue</h2>
        <p className="mt-3 max-w-xl text-sm font-normal text-slate-600">Open visits, review results, download official reports, and share secure PDF links from one mobile-friendly workspace.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const color = colorClasses[index % colorClasses.length];
          return (
            <Link className={`panel flex min-h-36 flex-col justify-between gap-6 transition hover:-translate-y-0.5 hover:border-interpath-blue sm:min-h-40 ${color.card}`} to={card.to} key={card.title}>
              <div className="flex items-start justify-between gap-3">
                <span className={`icon-bubble ${color.icon}`}>
                  <Icon size={21} />
                </span>
                <ArrowRight className={color.arrow} size={18} />
              </div>
              <div>
                <h3 className="font-normal">{card.title}</h3>
                <p className="mt-1 text-sm font-normal text-slate-600">{card.detail}</p>
              </div>
            </Link>
          );
        })}
      </section>
      <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="panel color-card-blue">
          <div className="flex items-start gap-3">
            <span className="icon-bubble icon-bubble-blue">
              <ShieldCheck size={21} />
            </span>
            <div>
              <h3 className="font-normal">Built for clinical privacy</h3>
              <p className="mt-1 text-sm text-slate-600">The app avoids permanent result storage on the device, keeps sessions protected, and shares only official PDF report links.</p>
            </div>
          </div>
        </article>
        <article className="panel color-card-green">
          <div className="flex items-start gap-3">
            <span className="icon-bubble icon-bubble-green">
              <ClipboardCheck size={21} />
            </span>
            <div>
              <h3 className="font-normal">Daily workflow ready</h3>
              <p className="mt-1 text-sm text-slate-600">Fast date filtering, clean visit cards, abnormal result flags, and PDF actions are optimized for phone use.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

const colorClasses = [
  { card: 'color-card-blue', icon: 'icon-bubble-blue', arrow: 'text-blue-300' },
  { card: 'color-card-green', icon: 'icon-bubble-green', arrow: 'text-sky-300' },
  { card: 'color-card-red', icon: 'icon-bubble-red', arrow: 'text-cyan-300' },
  { card: 'color-card-amber', icon: 'icon-bubble-amber', arrow: 'text-indigo-300' }
];

function getCards(role) {
  if (role === 'Patient') {
    return [
      { title: 'My visits', detail: 'Open your lab visits and see result progress.', icon: ClipboardList, to: '/visits' },
      { title: 'Official PDFs', detail: 'Preview or download generated laboratory reports.', icon: FileArchive, to: '/visits' },
      { title: 'Covid certificates', detail: 'Request certificates where the SLIS record supports it.', icon: FileCheck, to: '/visits' }
    ];
  }
  if (role === 'Clinic_Doctor') {
    return [
      { title: 'Patient visits', detail: 'Filter linked clinic visits and open result details.', icon: Search, to: '/visits' },
      { title: 'Secure sharing', detail: 'Share professional WhatsApp PDF links without raw values.', icon: MessageCircle, to: '/visits' },
      { title: 'Sample pickup', detail: 'Notify the lab when samples are ready for collection.', icon: Truck, to: '/sample-collection' }
    ];
  }
  return [
    { title: 'Daily SLIS list', detail: 'Pull visits by date across branches and open patient details.', icon: ClipboardList, to: '/visits' },
    { title: 'Result review', detail: 'View grouped test profiles, flags, comments, and credentials.', icon: FileCheck, to: '/visits' },
    { title: 'Operational reports', detail: 'Run summaries for clinics, tests, TAT, and main reports.', icon: FileText, to: '/reports' },
    { title: 'WhatsApp-ready PDFs', detail: 'Download or share official generated report links.', icon: MessageCircle, to: '/visits' }
  ];
}
