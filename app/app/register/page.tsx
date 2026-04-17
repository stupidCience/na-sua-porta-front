'use client';

import React, { useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { authAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatPersonalDocument } from '@/lib/documentMasks';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const isDelivery = type === 'delivery';
  const isAdmin = type === 'admin';
  const isVendor = type === 'vendor';
  const { setUser, setToken } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    apartment: '',
    block: '',
    personalDocument: '',
    condominiumId: '',
    condominiumName: '',
    vendorName: '',
    vendorCategory: '',
    vendorDescription: '',
    vendorContactPhone: '',
    vendorCnpj: '',
    vendorCnae: '',
    vendorLegalDocument: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextValue = name === 'personalDocument' ? formatPersonalDocument(value) : value;
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isAdmin
        ? await authAPI.registerAdmin(
            formData.email,
            formData.password,
            formData.name,
            formData.condominiumName,
          )
        : isVendor
        ? await authAPI.registerVendor(
            formData.email,
            formData.password,
            formData.name,
            formData.condominiumId,
            formData.vendorName,
            formData.vendorCnpj,
            formData.vendorCnae,
            formData.vendorLegalDocument,
            formData.vendorCategory || undefined,
            formData.vendorDescription || undefined,
            formData.vendorContactPhone || undefined,
          )
        : isDelivery
        ? await authAPI.registerDelivery(
            formData.email,
            formData.password,
            formData.name,
            formData.condominiumId,
            formData.personalDocument,
          )
        : await authAPI.register(
            formData.email,
            formData.password,
            formData.name,
            formData.apartment,
            formData.block,
            formData.condominiumId,
          );

      const { access_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      setToken(access_token);
      setUser(user);

      if (user.role === 'VENDOR' || user.isVendor) {
        router.push('/vendor/orders');
      } else if (user.role === 'RESIDENT') {
        router.push('/deliveries');
      } else if (user.role === 'CONDOMINIUM_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/deliveries/available');
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Não conseguimos concluir seu cadastro agora. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-amber-600 mb-2">🍕 Na Sua Porta</h1>
            <p className="text-gray-600">
              {isAdmin
                ? 'Cadastro do Condomínio'
                : isVendor
                ? 'Cadastro de Vendedor'
                : isDelivery
                ? 'Cadastro de Entregador'
                : 'Cadastro de Morador'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-2">
            <Link href="/register" className={`min-h-[44px] flex items-center justify-center py-2 px-3 text-center rounded-lg font-medium transition-all ${
              !isDelivery && !isAdmin && !isVendor
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
              Morador
            </Link>
            <Link href="/register?type=delivery" className={`min-h-[44px] flex items-center justify-center py-2 px-3 text-center rounded-lg font-medium transition-all ${
              isDelivery
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
              Entregador
            </Link>
            <Link href="/register?type=vendor" className={`min-h-[44px] flex items-center justify-center py-2 px-3 text-center rounded-lg font-medium transition-all ${
              isVendor
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
              Vendedor
            </Link>
            <Link href="/register?type=admin" className={`min-h-[44px] flex items-center justify-center py-2 px-3 text-center rounded-lg font-medium transition-all ${
              isAdmin
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
              Condomínio
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome Completo"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="João Silva"
              required
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              required
            />

            <Input
              label="Senha"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />

            {!isAdmin && (
              <Input
                label={isDelivery || isVendor ? 'ID do condomínio' : 'ID do condomínio (opcional)'}
                type="text"
                name="condominiumId"
                value={formData.condominiumId}
                onChange={handleChange}
                placeholder="cmx..."
                required={isDelivery || isVendor}
              />
            )}

            {isDelivery && (
              <Input
                label="Documento pessoal (RG/CPF)"
                type="text"
                name="personalDocument"
                value={formData.personalDocument}
                onChange={handleChange}
                placeholder="Digite seu RG ou CPF"
                required
              />
            )}

            {isAdmin && (
              <Input
                label="Nome do condomínio"
                type="text"
                name="condominiumName"
                value={formData.condominiumName}
                onChange={handleChange}
                placeholder="Condomínio Jardim das Flores"
                required
              />
            )}

            {isVendor && (
              <>
                <Input
                  label="Nome do comércio"
                  type="text"
                  name="vendorName"
                  value={formData.vendorName}
                  onChange={handleChange}
                  placeholder="Ex: Lanches da Praça"
                  required
                />

                <Input
                  label="Categoria (opcional)"
                  type="text"
                  name="vendorCategory"
                  value={formData.vendorCategory}
                  onChange={handleChange}
                  placeholder="Ex: Lanchonete"
                />

                <Input
                  label="Descrição (opcional)"
                  type="text"
                  name="vendorDescription"
                  value={formData.vendorDescription}
                  onChange={handleChange}
                  placeholder="Ex: Hamburguer artesanal e porções"
                />

                <Input
                  label="Telefone de contato (opcional)"
                  type="text"
                  name="vendorContactPhone"
                  value={formData.vendorContactPhone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                />

                <Input
                  label="CNPJ"
                  type="text"
                  name="vendorCnpj"
                  value={formData.vendorCnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                  required
                />

                <Input
                  label="CNAE"
                  type="text"
                  name="vendorCnae"
                  value={formData.vendorCnae}
                  onChange={handleChange}
                  placeholder="Ex: 5611-2/01"
                  required
                />

                <Input
                  label="Documento do responsável legal"
                  type="text"
                  name="vendorLegalDocument"
                  value={formData.vendorLegalDocument}
                  onChange={handleChange}
                  placeholder="RG/CPF do responsável"
                  required
                />
              </>
            )}

            {!isDelivery && !isAdmin && !isVendor && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Apartamento"
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleChange}
                    placeholder="101"
                    required={!isDelivery}
                  />

                  <Input
                    label="Bloco"
                    type="text"
                    name="block"
                    value={formData.block}
                    onChange={handleChange}
                    placeholder="A"
                    required={!isDelivery}
                  />
                </div>
              </>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading}>
              🚀 Criar minha conta
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Já tem conta?{' '}
            <Link href="/login" className="text-amber-600 hover:text-amber-700 font-semibold">
              Faça login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600">Preparando seu cadastro...</div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
