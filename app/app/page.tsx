'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, ChartNoAxesCombined, ShieldCheck, Store, Truck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { BRAND, BRAND_PILLARS, BRAND_ROLE_STRIPS } from '@/lib/brand';
import { getPostAuthLandingRoute } from '@/lib/routes';
import { useAuthStore } from '@/lib/store';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const ROLE_ICONS = [Building2, Store, Truck, ShieldCheck] as const;

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && user) {
      router.push(getPostAuthLandingRoute(user));
    }
  }, [user, router, isAuthenticated]);

  return (
    <div>
      {/* Hero */}
      <section className="px-6 pt-16 pb-20 max-w-5xl mx-auto text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
        >
          <BrandLogo size="lg" showSubtitle subtitle={BRAND.slogan} className="justify-center mb-8" />
        </motion.div>
        <motion.h1
          className="text-4xl md:text-5xl font-bold text-[var(--color-secondary)] leading-tight max-w-3xl mx-auto tracking-[-0.02em]"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
        >
          {BRAND.slogan}
        </motion.h1>
        <motion.p
          className="mt-5 text-lg text-[var(--color-foreground-soft)] max-w-2xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
        >
          {BRAND.metadataDescription}
        </motion.p>
        <motion.div
          className="mt-8 flex items-center justify-center gap-4 flex-wrap"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white hover:bg-[var(--color-primary-dark)] transition-all shadow-md hover:shadow-lg"
          >
            Criar minha conta
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] px-6 py-3 text-base font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background-soft)] transition-colors"
          >
            Já tenho conta
          </Link>
        </motion.div>
      </section>

      {/* Role Strip */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {BRAND_ROLE_STRIPS.map((role, i) => {
            const Icon = ROLE_ICONS[i];
            return (
              <motion.div
                key={role}
                className="flex items-center gap-2.5 rounded-full bg-[var(--color-background-soft)] border border-[var(--color-line)] px-5 py-2.5 text-sm font-medium text-[var(--color-secondary)]"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i + 4}
              >
                <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                {role}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Pillars — Bento Grid */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-[var(--color-secondary)] text-center mb-10 tracking-[-0.01em]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          {BRAND.supportLine}
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRAND_PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 1}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-[var(--color-accent)]/20">
                  <ChartNoAxesCombined className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-secondary)]">
                  {pillar.title}
                </h3>
              </div>
              <p className="text-[var(--color-foreground-soft)] text-sm leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div
            className="rounded-2xl bg-[var(--color-background-soft)] border border-[var(--color-line)] p-7"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <Store className="h-6 w-6 text-[var(--color-primary)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-secondary)] mb-2">
              Fluxo comercial visível
            </h3>
            <p className="text-[var(--color-foreground-soft)] text-sm leading-relaxed">
              Pedidos, despacho e entrega evoluem com mais clareza para quem compra, vende e opera.
            </p>
          </motion.div>
          <motion.div
            className="rounded-2xl bg-[var(--color-background-soft)] border border-[var(--color-line)] p-7"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
          >
            <ShieldCheck className="h-6 w-6 text-[var(--color-primary)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-secondary)] mb-2">
              Marca única para o condomínio
            </h3>
            <p className="text-[var(--color-foreground-soft)] text-sm leading-relaxed">
              Linguagem, cores e experiência falam com todas as pontas sem perder consistência comercial.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
