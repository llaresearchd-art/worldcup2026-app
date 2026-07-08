// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="mt-10 px-4 pb-8 pt-4">
      <div className="h-px w-full mb-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,163,0,0.2), transparent)' }} />
      <p className="text-center text-[11px] text-chalk/25">
        Built by{' '}
        <a href="https://www.mridwanrahman.com/" target="_blank" rel="noopener noreferrer"
          className="font-medium text-floodlight/60 hover:text-floodlight transition-colors">
          Mohammad Ridwan Rahman
        </a>
      </p>
    </footer>
  );
}
