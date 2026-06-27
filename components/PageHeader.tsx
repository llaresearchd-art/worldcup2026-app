// components/PageHeader.tsx
export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-4 pt-6 pb-2">
      <h1 className="font-display text-3xl uppercase tracking-wide text-chalk">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-chalk/50">{subtitle}</p>}
    </header>
  );
}
