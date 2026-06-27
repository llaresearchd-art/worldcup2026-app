// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="mt-8 border-t border-chalk/10 px-4 py-6 text-center">
      <p className="text-xs text-chalk/40">
        Built by{' '}
        <a
          href="https://www.mridwanrahman.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-floodlight hover:underline"
        >
          Mohammad Ridwan Rahman
        </a>
      </p>
    </footer>
  );
}
