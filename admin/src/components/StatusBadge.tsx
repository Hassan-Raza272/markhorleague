import type { RegistrationStatus } from '../types';

const statusStyles: Record<
  RegistrationStatus,
  { wrap: string; dot: string; ring: string }
> = {
  APPROVED: {
    wrap: 'bg-[#12240A] text-[#C5E85A] border-[#A3CF2D]',
    dot: 'bg-[#A3CF2D]',
    ring: 'border-[#3A5A14]',
  },
  PENDING: {
    wrap: 'bg-[#2A1F08] text-[#E0C15A] border-[#D4AF37]',
    dot: 'bg-[#D4AF37]',
    ring: 'border-[#5C4814]',
  },
  REJECTED: {
    wrap: 'bg-[#2A0C0C] text-[#FCA5A5] border-[#F87171]',
    dot: 'bg-[#EF4444]',
    ring: 'border-[#7F1D1D]',
  },
};

const statusLabels: Record<RegistrationStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending Review',
  REJECTED: 'Rejected',
};

const FALLBACK = {
  wrap: 'bg-gray-900 text-gray-300 border-gray-600',
  dot: 'bg-gray-400',
  ring: 'border-gray-700',
};

export function StatusBadge({ status }: { status: string }) {
  const key = status as RegistrationStatus;
  const style = statusStyles[key] ?? FALLBACK;
  const label = statusLabels[key] ?? status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border-[1.5px] ${style.wrap}`}>
      <span
        className={`inline-flex h-3 w-3 items-center justify-center rounded-full border-[1.5px] ${style.ring}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      </span>
      {label}
    </span>
  );
}
