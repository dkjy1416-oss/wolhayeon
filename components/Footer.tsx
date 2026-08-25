import Link from "next/link";

const links = [
  { label: "이용안내", href: "#" },
  { label: "개인정보처리방침", href: "#" },
  { label: "환불정책", href: "#" },
];

export default function Footer() {
  return (
    <footer className="border-t border-gold-dim/15 px-6 py-12">
      <div className="mx-auto max-w-5xl text-center">
        <p className="font-display text-base text-ivory">
          월하연 <span className="text-gold">月下緣</span>
        </p>

        <nav className="mt-6 flex items-center justify-center gap-6">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-xs text-ivory-dim transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-8 text-[0.65rem] text-ivory-dim/50">
          © {new Date().getFullYear()} 월하연. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
