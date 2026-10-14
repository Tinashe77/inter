import { Link } from 'react-router-dom';
import { ArrowRight, Building2, ClipboardList, FileCheck, FileText, FlaskConical, KeyRound, LockKeyhole, MessageCircle, Search, Truck } from 'lucide-react';
import { useAuthStore } from '../auth/authStore.js';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const cards = getCards(user?.usertype);

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2E3092] via-[#2563EB] to-[#38BDF8] p-6 text-white shadow-xl shadow-blue-500/20">
        <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold tracking-[0.12em] text-blue-100">CLINICAL WORKSPACE</p>
        <h2 className="mt-5 text-3xl font-bold leading-tight">{welcomeName(user)}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-blue-100">Review visits, open verified results, and share reports securely.</p>
      </section>
      <div className="flex items-center justify-between"><h3 className="text-xl font-bold">Quick actions</h3><span className="text-xs font-bold text-emerald-700">Secure access</span></div>
      <section className="space-y-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const color = colorClasses[index % colorClasses.length];
          return (
            <Link className="panel flex items-center gap-4 !p-4 transition hover:border-interpath-blue" to={card.to} key={card.title}>
              <span className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl p-3 ${color.icon}`}><Icon size={24} /></span>
              <span className="min-w-0 flex-1"><strong className="block font-semibold">{card.title}</strong><span className="mt-1 block text-sm text-slate-500">{card.detail}</span></span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50"><ArrowRight size={18} /></span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

const colorClasses = [
  { icon: 'bg-blue-50 text-interpath-blue' },
  { icon: 'bg-red-50 text-interpath-red' },
  { icon: 'bg-emerald-50 text-emerald-700' },
  { icon: 'bg-indigo-50 text-indigo-700' }
];

function welcomeName(user) { const first = String(user?.name || user?.username || '').trim().split(/\s+/)[0]; return first ? `Good day, ${first}` : 'Good day'; }

function getCards(role) {
  if (role === 'Patient') {
    return [
      { title: 'My visits', detail: 'Open your lab visits and see result progress.', icon: ClipboardList, to: '/visits' },
      { title: 'Official PDFs', detail: 'Preview or download generated laboratory reports.', icon: FileText, to: '/visits' },
      { title: 'Covid certificates', detail: 'Request certificates where the SLIS record supports it.', icon: LockKeyhole, to: '/visits' },
      { title: 'Change password', detail: 'Update your protected SLIS sign-in password.', icon: KeyRound, to: '/change-password' }
    ];
  }
  if (role === 'Clinic_Doctor') {
    return [
      { title: 'Patient visits', detail: 'Filter linked clinic visits and open result details.', icon: Search, to: '/visits' },
      { title: 'Secure sharing', detail: 'Share professional WhatsApp PDF links without raw values.', icon: MessageCircle, to: '/visits' },
      { title: 'Sample pickup', detail: 'Notify the lab when samples are ready for collection.', icon: Truck, to: '/sample-collection' },
      { title: 'Change password', detail: 'Update your protected SLIS sign-in password.', icon: KeyRound, to: '/change-password' }
    ];
  }
  return [
    { title: 'Daily SLIS list', detail: 'Pull visits by date across branches and open patient details.', icon: ClipboardList, to: '/visits' },
    { title: 'Result review', detail: 'View grouped test profiles, flags, comments, and credentials.', icon: FileCheck, to: '/visits' },
    { title: 'Operational reports', detail: 'Run summaries for clinics, tests, TAT, and main reports.', icon: FileText, to: '/reports' },
    { title: 'WhatsApp-ready PDFs', detail: 'Download or share official generated report links.', icon: MessageCircle, to: '/visits' },
    { title: 'Clinic directory', detail: 'Open clinic and doctor contact information.', icon: Building2, to: '/clinics' },
    { title: 'API tester', detail: 'Run approved SLIS integration checks.', icon: FlaskConical, to: '/api-tester' }
  ];
}
