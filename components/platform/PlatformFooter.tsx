export default function PlatformFooter() {
  return (
    <footer id="auth" className="border-t border-line py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-semibold text-ink">Agro Olam</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Я AI Дехқон platformasi. Marketplace — keyin.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Kontaktlar
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>
                <a href="mailto:info@agroolam.uz" className="hover:text-brand">
                  info@agroolam.uz
                </a>
              </li>
              <li>
                <a href="tel:+998901234567" className="hover:text-brand">
                  +998 90 123 45 67
                </a>
              </li>
              <li>Toshkent, O&apos;zbekiston</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Ijtimoiy
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>
                <a href="#" className="hover:text-brand">
                  Telegram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand">
                  YouTube
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              API
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>
                <a href="/api/docs" className="hover:text-brand">
                  Dokumentatsiya
                </a>
              </li>
              <li>
                <a href="/api/agronom/health" className="hover:text-brand">
                  Health
                </a>
              </li>
              <li>
                <a href="/api/docs/openapi.json" className="hover:text-brand">
                  OpenAPI
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-6 text-center text-xs text-ink-faint">
          © {new Date().getFullYear()} Я AI Дехқон
        </div>
      </div>
    </footer>
  );
}
