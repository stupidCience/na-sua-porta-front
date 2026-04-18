export default function Loading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4">
      <div className="surface-panel w-full max-w-md rounded-[28px] px-8 py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-[var(--color-line)] bg-white/90 shadow-[0_18px_40px_rgba(28,25,23,0.1)]">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[var(--color-primary)] border-t-transparent" />
        </div>
        <p className="eyebrow mt-5 text-[var(--color-primary-dark)]">Carregando</p>
        <h2 className="mt-3 text-2xl font-semibold text-[var(--color-secondary)]">
          Preparando sua experiência
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
          Estamos carregando suas lojas, pedidos e entregas.
        </p>
      </div>
    </div>
  );
}