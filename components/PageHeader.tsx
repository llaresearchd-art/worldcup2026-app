// components/PageHeader.tsx
export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="relative px-4 pt-7 pb-4 overflow-hidden">
      <div className="pointer-events-none absolute -top-6 left-0 right-0 h-20 opacity-20"
        style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, #F4A300, transparent)' }} />
      <h1 className="relative font-display text-4xl uppercase leading-none text-gradient">{title}</h1>
      {subtitle && <p className="relative mt-1 text-xs font-medium text-chalk/40">{subtitle}</p>}
    </header>
  );
}
