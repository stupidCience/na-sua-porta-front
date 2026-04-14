'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { usersAPI, condominiumsAPI, deliveriesAPI, vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { formatPersonalDocument } from '@/lib/documentMasks';
import type { Delivery } from '@/lib/store';

// ─── Types ─────────────────────────────────────────────────────────────────

type ResidentTab = 'perfil' | 'endereco' | 'vinculo' | 'senha' | 'avaliacoes' | 'notificacoes';
type CourierTab = 'perfil' | 'veiculo' | 'disponibilidade' | 'vinculo' | 'senha';
type VendorTab = 'perfil' | 'comercio' | 'vinculo' | 'senha';
type AdminTab =
  | 'perfil'
  | 'senha'
  | 'condominio'
  | 'usuarios'
  | 'acesso'
  | 'relatorios';
type AnyTab = ResidentTab | CourierTab | VendorTab | AdminTab;

const TAB_LABELS: Record<AnyTab, string> = {
  perfil: 'Meu Perfil',
  endereco: 'Meu Endereço',
  vinculo: 'Vínculo Condomínio',
  senha: 'Segurança',
  avaliacoes: 'Minhas Avaliações',
  notificacoes: 'Notificações',
  veiculo: 'Veículo',
  comercio: 'Meu Comércio',
  disponibilidade: 'Disponibilidade',
  condominio: 'Condomínio',
  usuarios: 'Usuários',
  acesso: 'Código de Acesso',
  relatorios: 'Relatórios',
};

const TAB_ICONS: Record<AnyTab, string> = {
  perfil: '👤',
  endereco: '🏠',
  vinculo: '🧩',
  senha: '🔒',
  avaliacoes: '⭐',
  notificacoes: '🔔',
  veiculo: '🛵',
  comercio: '🏪',
  disponibilidade: '🟢',
  condominio: '🏢',
  usuarios: '👥',
  acesso: '🔑',
  relatorios: '📊',
};

const ROLE_LABELS: Record<string, string> = {
  RESIDENT: 'Morador',
  DELIVERY_PERSON: 'Entregador',
  VENDOR: 'Comerciante',
  CONDOMINIUM_ADMIN: 'Administrador',
};

const ROLE_COLOR: Record<string, string> = {
  RESIDENT: 'bg-blue-100 text-blue-800',
  DELIVERY_PERSON: 'bg-amber-100 text-amber-800',
  VENDOR: 'bg-emerald-100 text-emerald-800',
  CONDOMINIUM_ADMIN: 'bg-purple-100 text-purple-800',
};

// ─── Section components ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-800 mb-4">{children}</h2>;
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, hasHydrated } = useAuthStore();
  const { emit } = useSocket(user?.id, user?.role);
  const { addToast } = useToastStore();

  const tabs: AnyTab[] =
    user?.role === 'RESIDENT'
      ? ['perfil', 'endereco', 'vinculo', 'senha', 'avaliacoes', 'notificacoes']
      : user?.role === 'DELIVERY_PERSON'
        ? ['perfil', 'veiculo', 'disponibilidade', 'vinculo', 'senha']
        : user?.role === 'VENDOR'
          ? ['perfil', 'comercio', 'vinculo', 'senha']
        : ['perfil', 'senha', 'condominio', 'usuarios', 'acesso', 'relatorios'];

  const [activeTab, setActiveTab] = useState<AnyTab>(tabs[0]);

  // ── Profile form
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', personalDocument: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Vendor documents (VENDOR)
  const [vendorDocs, setVendorDocs] = useState({
    vendorCnpj: '',
    vendorCnae: '',
    vendorLegalDocument: '',
  });

  // ── Address form (RESIDENT)
  const [addressForm, setAddressForm] = useState({ apartment: '', block: '' });
  const [savingAddress, setSavingAddress] = useState(false);

  // ── Vehicle form (DELIVERY_PERSON)
  const [vehicleForm, setVehicleForm] = useState({ vehicleInfo: '' });
  const [savingVehicle, setSavingVehicle] = useState(false);

  // ── Availability (DELIVERY_PERSON)
  const [isAvailable, setIsAvailable] = useState(true);

  // ── Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Condominium link form (ALL ROLES)
  const [linkCondominiumCode, setLinkCondominiumCode] = useState('');
  const [linkingCondominium, setLinkingCondominium] = useState(false);

  // ── Condominium form (ADMIN)
  const [condoForm, setCondoForm] = useState({
    name: '',
    address: '',
    operatingHours: '',
    maxActiveDeliveries: '',
  });
  const [savingCondo, setSavingCondo] = useState(false);
  const [loadingCondo, setLoadingCondo] = useState(false);

  // ── Users list (ADMIN)
  const [condoUsers, setCondoUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'RESIDENT' | 'DELIVERY_PERSON'>('ALL');

  // ── Ratings history (RESIDENT)
  const [ratedDeliveries, setRatedDeliveries] = useState<Delivery[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // ── Notifications (RESIDENT) — stored in localStorage
  const [notifSound, setNotifSound] = useState(true);
  const [notifBanner, setNotifBanner] = useState(true);

  // ── CSV export
  const [exportingCsv, setExportingCsv] = useState(false);

  // ── Copy coupon
  const [copied, setCopied] = useState(false);

  // ─ Initialise from user/localStorage
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }
    setProfileForm({
      name: user.name ?? '',
      phone: user.phone ?? '',
      personalDocument: user.personalDocument ?? '',
    });
    setAddressForm({ apartment: user.apartment ?? '', block: user.block ?? '' });
    setVehicleForm({ vehicleInfo: user.vehicleInfo ?? '' });
    setLinkCondominiumCode(user.condominiumId ?? '');

    if (typeof window !== 'undefined') {
      setIsAvailable(localStorage.getItem('nsp_availability') !== 'offline');
      setNotifSound(localStorage.getItem('nsp_notif_sound') !== 'off');
      setNotifBanner(localStorage.getItem('nsp_notif_banner') !== 'off');
    }

    let cancelled = false;

    usersAPI
      .getMe()
      .then((res) => {
        if (cancelled) return;

        setProfileForm({
          name: res.data?.name ?? user.name ?? '',
          phone: res.data?.phone ?? '',
          personalDocument: res.data?.personalDocument ?? '',
        });
        setAddressForm({
          apartment: res.data?.apartment ?? '',
          block: res.data?.block ?? '',
        });
        setVehicleForm({ vehicleInfo: res.data?.vehicleInfo ?? '' });
        setLinkCondominiumCode(res.data?.condominiumId ?? user.condominiumId ?? '');
      })
      .catch(() => {
        // Keep page functional even if profile refresh fails.
      });

    if (user.role === 'VENDOR') {
      vendorsAPI
        .getMe()
        .then((res) => {
          setVendorDocs({
            vendorCnpj: res.data?.cnpj ?? '',
            vendorCnae: res.data?.cnae ?? '',
            vendorLegalDocument: res.data?.legalRepresentativeDocument ?? '',
          });
        })
        .catch(() => {
          // Keep profile usable even if vendor details fail to load.
        });
    }

    return () => {
      cancelled = true;
    };
  }, [user, router, hasHydrated]);

  // ─ Lazy load data when tab changes
  useEffect(() => {
    if (activeTab === 'condominio' && user?.role === 'CONDOMINIUM_ADMIN') loadCondoData();
    if (activeTab === 'usuarios' && user?.role === 'CONDOMINIUM_ADMIN') loadCondoUsers();
    if (activeTab === 'avaliacoes' && user?.role === 'RESIDENT') loadRatings();
  }, [activeTab]); // eslint-disable-line

  // ─── Loaders ───────────────────────────────────────────────────────────

  const loadCondoData = async () => {
    setLoadingCondo(true);
    try {
      const res = await condominiumsAPI.getMe();
      const c = res.data;
      setCondoForm({
        name: c.name ?? '',
        address: c.address ?? '',
        operatingHours: c.operatingHours ?? '',
        maxActiveDeliveries: c.maxActiveDeliveries?.toString() ?? '',
      });
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos carregar os dados do condomínio agora.'), 'error');
    } finally {
      setLoadingCondo(false);
    }
  };

  const loadCondoUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await usersAPI.getCondominiumUsers();
      setCondoUsers(res.data);
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos carregar os usuários agora.'), 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadRatings = async () => {
    setLoadingRatings(true);
    try {
      const res = await deliveriesAPI.getHistory();
      setRatedDeliveries((res.data as Delivery[]).filter((d) => d.rating));
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos carregar suas avaliações agora.'), 'error');
    } finally {
      setLoadingRatings(false);
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      addToast('Informe seu nome para salvar o perfil.', 'error');
      return;
    }
    if (user?.role === 'DELIVERY_PERSON' && !profileForm.personalDocument.trim()) {
      addToast('Documento pessoal (RG/CPF) é obrigatório para entregadores.', 'error');
      return;
    }
    if (user?.role === 'VENDOR') {
      if (!vendorDocs.vendorCnpj.trim() || !vendorDocs.vendorCnae.trim() || !vendorDocs.vendorLegalDocument.trim()) {
        addToast('Preencha CNPJ, CNAE e documento do responsável legal.', 'error');
        return;
      }
    }

    setSavingProfile(true);
    try {
      const res = await usersAPI.updateMe({
        name: profileForm.name,
        phone: profileForm.phone,
        personalDocument: profileForm.personalDocument,
      });

      if (user?.role === 'VENDOR') {
        await usersAPI.updateDocuments({
          vendorCnpj: vendorDocs.vendorCnpj,
          vendorCnae: vendorDocs.vendorCnae,
          vendorLegalDocument: vendorDocs.vendorLegalDocument,
        });
      }

      setUser({
        ...user!,
        name: res.data.name,
        phone: res.data.phone,
        personalDocument: res.data.personalDocument,
      });
      addToast('✅ Perfil atualizado com sucesso!', 'success');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos salvar seu perfil agora.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.apartment.trim() || !addressForm.block.trim()) {
      addToast('Informe apartamento e bloco para continuar.', 'error');
      return;
    }
    setSavingAddress(true);
    try {
      const res = await usersAPI.updateMe({
        apartment: addressForm.apartment,
        block: addressForm.block,
      });
      setUser({ ...user!, apartment: res.data.apartment, block: res.data.block });
      addToast('🏠 Endereço atualizado com sucesso!', 'success');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos salvar seu endereço agora.'), 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveVehicle = async () => {
    setSavingVehicle(true);
    try {
      const res = await usersAPI.updateMe({ vehicleInfo: vehicleForm.vehicleInfo });
      setUser({ ...user!, vehicleInfo: res.data.vehicleInfo });
      addToast('🛵 Dados do veículo salvos com sucesso!', 'success');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos salvar os dados do veículo agora.'), 'error');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleToggleAvailability = (value: boolean) => {
    setIsAvailable(value);
    localStorage.setItem('nsp_availability', value ? 'online' : 'offline');
    emit('set-availability', { userId: user!.id, available: value });
    addToast(
      value ? '🟢 Você está disponível para novas entregas' : '🟡 Você ficou indisponível no momento',
      value ? 'success' : 'warning',
    );
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      addToast('Preencha todos os campos de senha para continuar.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('A confirmação da nova senha não confere.', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      addToast('A nova senha precisa ter pelo menos 6 caracteres.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await usersAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      addToast('🔐 Senha alterada com sucesso!', 'success');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos alterar sua senha agora.'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLinkCondominium = async () => {
    if (!linkCondominiumCode.trim()) {
      addToast('Informe o código do condomínio para vincular sua conta.', 'error');
      return;
    }

    setLinkingCondominium(true);
    try {
      const res = await usersAPI.linkToCondominium(linkCondominiumCode.trim());
      setUser({
        ...user!,
        condominiumId: res.data.condominiumId,
        condominiumName: res.data.condominium?.name ?? null,
      });
      setLinkCondominiumCode(res.data.condominiumId ?? linkCondominiumCode.trim());
      addToast('🏢 Vínculo com o condomínio atualizado com sucesso!', 'success');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos vincular ao condomínio agora.'), 'error');
    } finally {
      setLinkingCondominium(false);
    }
  };

  const handleSaveCondo = async () => {
    setSavingCondo(true);
    try {
      await condominiumsAPI.updateMe({
        name: condoForm.name,
        address: condoForm.address,
        operatingHours: condoForm.operatingHours,
        maxActiveDeliveries: condoForm.maxActiveDeliveries
          ? Number(condoForm.maxActiveDeliveries)
          : undefined,
      });
      setUser({ ...user!, condominiumName: condoForm.name });
      addToast('🏢 Dados do condomínio atualizados com sucesso!', 'success');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos salvar os dados do condomínio agora.'), 'error');
    } finally {
      setSavingCondo(false);
    }
  };

  const handleToggleUserStatus = async (targetId: string, active: boolean) => {
    setTogglingUserId(targetId);
    try {
      await usersAPI.toggleUserStatus(targetId, active);
      setCondoUsers((prev) => prev.map((u) => (u.id === targetId ? { ...u, active } : u)));
      addToast(active ? '✅ Usuário ativado com sucesso' : '⚠️ Usuário desativado com sucesso', 'success');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos alterar o status do usuário agora.'), 'error');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleCopyCondoId = () => {
    if (user?.condominiumId) {
      navigator.clipboard.writeText(user.condominiumId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await deliveriesAPI.exportCsv();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `entregas-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addToast('📊 Relatório exportado com sucesso!', 'success');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos exportar o relatório agora.'), 'error');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleNotifToggle = (key: 'sound' | 'banner', value: boolean) => {
    if (key === 'sound') {
      setNotifSound(value);
      localStorage.setItem('nsp_notif_sound', value ? 'on' : 'off');
    } else {
      setNotifBanner(value);
      localStorage.setItem('nsp_notif_banner', value ? 'on' : 'off');
    }
    addToast(value ? '🔔 Notificação ativada' : '🔕 Notificação desativada', 'info');
  };

  if (!user) return null;

  const filteredUsers =
    userRoleFilter === 'ALL'
      ? condoUsers
      : condoUsers.filter((u) => u.role === userRoleFilter);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
        {/* Profile header */}
        <Card className="mb-6 p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[user.role]}`}
                >
                  {ROLE_LABELS[user.role]}
                </span>
                {user.condominiumName && (
                  <span className="text-xs text-gray-500">· {user.condominiumName}</span>
                )}
                {user.role === 'RESIDENT' && user.apartment && (
                  <span className="text-xs text-gray-500">
                    · Apto {user.apartment}
                    {user.block ? ` / Bloco ${user.block}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-amber-50 hover:text-amber-700 border border-gray-200'
              }`}
            >
              <span>{TAB_ICONS[tab]}</span>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <Card className="p-6">

          {/* ── Meu Perfil ─────────────────────────────────────────────── */}
          {activeTab === 'perfil' && (
            <div>
              <SectionTitle>Meu Perfil</SectionTitle>
              <FieldGroup>
                <Input
                  label="Nome completo"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Seu nome"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <p className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
                    {user.email}
                    <span className="ml-2 text-xs text-gray-400">(não editável)</span>
                  </p>
                </div>
                <Input
                  label="Telefone / WhatsApp"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  type="tel"
                />

                <Input
                  label={
                    user.role === 'DELIVERY_PERSON'
                      ? 'Documento pessoal (RG/CPF)'
                      : 'Documento pessoal'
                  }
                  value={profileForm.personalDocument}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      personalDocument: formatPersonalDocument(e.target.value),
                    }))
                  }
                  placeholder="Informe seu RG ou CPF"
                />
                {user.role === 'DELIVERY_PERSON' && (
                  <p className="text-xs text-amber-700 -mt-2">
                    Este campo é obrigatório para entregadores.
                  </p>
                )}

                {user.role === 'VENDOR' && (
                  <>
                    <Input
                      label="CNPJ"
                      value={vendorDocs.vendorCnpj}
                      onChange={(e) =>
                        setVendorDocs((v) => ({ ...v, vendorCnpj: e.target.value }))
                      }
                      placeholder="00.000.000/0000-00"
                    />
                    <Input
                      label="CNAE"
                      value={vendorDocs.vendorCnae}
                      onChange={(e) =>
                        setVendorDocs((v) => ({ ...v, vendorCnae: e.target.value }))
                      }
                      placeholder="Ex: 5611-2/01"
                    />
                    <Input
                      label="Documento do responsável legal"
                      value={vendorDocs.vendorLegalDocument}
                      onChange={(e) =>
                        setVendorDocs((v) => ({ ...v, vendorLegalDocument: e.target.value }))
                      }
                      placeholder="RG/CPF do responsável"
                    />
                  </>
                )}

                <div className="pt-2">
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
                  </Button>
                </div>
              </FieldGroup>
            </div>
          )}

          {activeTab === 'comercio' && (
            <div>
              <SectionTitle>Meu Comércio</SectionTitle>
              <p className="text-sm text-gray-500 mb-4">
                Use a central do comerciante para gerenciar cardápio, pedidos e indicadores do seu negócio.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => router.push('/vendor/store')}>Abrir Gestão do Comércio</Button>
                <Button variant="secondary" onClick={() => router.push('/vendor/orders')}>
                  Ver Pedidos Ativos
                </Button>
                <Button variant="secondary" onClick={() => router.push('/vendor/dashboard')}>
                  Ver Dashboard de Vendas
                </Button>
              </div>
            </div>
          )}

          {/* ── Meu Endereço (RESIDENT) ─────────────────────────────────── */}
          {activeTab === 'endereco' && (
            <div>
              <SectionTitle>Meu Endereço</SectionTitle>
              <p className="text-sm text-gray-500 mb-4">
                Esses dados são pré-preenchidos automaticamente ao fazer um pedido.
              </p>
              <FieldGroup>
                <Input
                  label="Número do apartamento"
                  value={addressForm.apartment}
                  onChange={(e) => setAddressForm((f) => ({ ...f, apartment: e.target.value }))}
                  placeholder="Ex: 101"
                />
                <Input
                  label="Bloco"
                  value={addressForm.block}
                  onChange={(e) => setAddressForm((f) => ({ ...f, block: e.target.value }))}
                  placeholder="Ex: A"
                />
                <div className="pt-2">
                  <Button onClick={handleSaveAddress} disabled={savingAddress}>
                    {savingAddress ? 'Salvando...' : 'Salvar Endereço'}
                  </Button>
                </div>
              </FieldGroup>
            </div>
          )}

          {/* ── Veículo (DELIVERY_PERSON) ──────────────────────────────── */}
          {activeTab === 'veiculo' && (
            <div>
              <SectionTitle>Veículo / Identificação</SectionTitle>
              <p className="text-sm text-gray-500 mb-4">
                Visível para moradores quando você aceitar uma entrega.
              </p>
              <FieldGroup>
                <Input
                  label="Tipo de veículo e placa"
                  value={vehicleForm.vehicleInfo}
                  onChange={(e) => setVehicleForm({ vehicleInfo: e.target.value })}
                  placeholder="Ex: Moto Honda CG 160 – ABC-1234"
                />
                <div className="pt-2">
                  <Button onClick={handleSaveVehicle} disabled={savingVehicle}>
                    {savingVehicle ? 'Salvando...' : 'Salvar Veículo'}
                  </Button>
                </div>
              </FieldGroup>
            </div>
          )}

          {/* ── Disponibilidade (DELIVERY_PERSON) ─────────────────────── */}
          {activeTab === 'disponibilidade' && (
            <div>
              <SectionTitle>Disponibilidade</SectionTitle>
              <p className="text-sm text-gray-500 mb-6">
                Controle se você aparece como online para moradores e novos pedidos.
              </p>
              <div className="flex flex-col gap-4">
                <div
                  className={`flex items-center justify-between p-5 rounded-xl border-2 transition-colors cursor-pointer ${
                    isAvailable
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                  onClick={() => handleToggleAvailability(!isAvailable)}
                >
                  <div>
                    <p className="font-semibold text-gray-800">
                      {isAvailable ? '🟢 Disponível' : '🔴 Indisponível'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {isAvailable
                        ? 'Você aparece como online e pode receber pedidos'
                        : 'Você está offline — novos pedidos não aparecerão para você'}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      isAvailable ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        isAvailable ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Esta configuração é salva localmente e resetada quando você sai da conta.
                </p>
              </div>
            </div>
          )}

          {/* ── Segurança (senha) ──────────────────────────────────────── */}
          {activeTab === 'senha' && (
            <div>
              <SectionTitle>Alterar Senha</SectionTitle>
              <FieldGroup>
                <Input
                  label="Senha atual"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                  }
                  placeholder="••••••••"
                />
                <Input
                  label="Nova senha"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                  }
                  placeholder="Mínimo 6 caracteres"
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                  }
                  placeholder="Repita a nova senha"
                />
                {passwordForm.newPassword &&
                  passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-sm text-red-500">As senhas não conferem.</p>
                  )}
                <div className="pt-2">
                  <Button onClick={handleChangePassword} disabled={savingPassword}>
                    {savingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </div>
              </FieldGroup>
            </div>
          )}

          {/* ── Vínculo com Condomínio (ALL ROLES) ─────────────────────── */}
          {activeTab === 'vinculo' && (
            <div>
              <SectionTitle>Vínculo com Condomínio</SectionTitle>
              <p className="text-sm text-gray-500 mb-4">
                Cole o código de acesso fornecido pelo administrador para vincular sua conta.
              </p>

              {user.condominiumId && (
                <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                  <p className="text-sm text-emerald-800">
                    Atualmente vinculado a: <strong>{user.condominiumName || 'Condomínio sem nome'}</strong>
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">Código atual: {user.condominiumId}</p>
                </div>
              )}

              <FieldGroup>
                <Input
                  label="Código do condomínio"
                  value={linkCondominiumCode}
                  onChange={(e) => setLinkCondominiumCode(e.target.value)}
                  placeholder="Ex: cm8xk0abc0001xyz123..."
                />
                <div className="pt-2">
                  <Button onClick={handleLinkCondominium} disabled={linkingCondominium}>
                    {linkingCondominium ? 'Vinculando...' : 'Vincular ao Condomínio'}
                  </Button>
                </div>
              </FieldGroup>

              {user.role === 'CONDOMINIUM_ADMIN' && (
                <p className="text-xs text-amber-700 mt-4">
                  Alterar o vínculo muda o condomínio da sua conta de administrador.
                </p>
              )}
            </div>
          )}

          {/* ── Minhas Avaliações (RESIDENT) ───────────────────────────── */}
          {activeTab === 'avaliacoes' && (
            <div>
              <SectionTitle>Minhas Avaliações</SectionTitle>
              {loadingRatings ? (
                <p className="text-gray-400 text-sm">Carregando avaliações...</p>
              ) : ratedDeliveries.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">⭐</p>
                  <p>Você ainda não avaliou nenhuma entrega.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {ratedDeliveries.map((d) => (
                    <div key={d.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Entregador:{' '}
                            <span className="text-gray-900">
                              {d.deliveryPerson?.name ?? '–'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(d.deliveredAt ?? d.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <StarRating rating={d.rating!} readonly />
                      </div>
                      {d.ratingComment && (
                        <p className="mt-2 text-sm text-gray-600 italic">
                          &ldquo;{d.ratingComment}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Notificações (RESIDENT) ─────────────────────────────────── */}
          {activeTab === 'notificacoes' && (
            <div>
              <SectionTitle>Notificações</SectionTitle>
              <p className="text-sm text-gray-500 mb-6">
                Preferências de notificação salvas localmente neste dispositivo.
              </p>
              <div className="flex flex-col gap-3">
                {(
                  [
                    {
                      key: 'sound' as const,
                      label: 'Sons de notificação',
                      description: 'Toca um som quando o status da sua entrega muda',
                      value: notifSound,
                    },
                    {
                      key: 'banner' as const,
                      label: 'Banners na tela',
                      description: 'Exibe um alerta visual quando o status muda',
                      value: notifBanner,
                    },
                  ] as const
                ).map(({ key, label, description, value }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50 cursor-pointer"
                    onClick={() => handleNotifToggle(key, !value)}
                  >
                    <div>
                      <p className="font-medium text-gray-800">{label}</p>
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                    <div
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        value ? 'bg-amber-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Dados do Condomínio (ADMIN) ─────────────────────────────── */}
          {activeTab === 'condominio' && (
            <div>
              <SectionTitle>Dados do Condomínio</SectionTitle>
              {loadingCondo ? (
                <p className="text-gray-400 text-sm">Carregando...</p>
              ) : (
                <FieldGroup>
                  <Input
                    label="Nome do condomínio"
                    value={condoForm.name}
                    onChange={(e) => setCondoForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Residencial Solar"
                  />
                  <Input
                    label="Endereço"
                    value={condoForm.address}
                    onChange={(e) => setCondoForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Rua, número, bairro, cidade"
                  />
                  <Input
                    label="Horário de funcionamento"
                    value={condoForm.operatingHours}
                    onChange={(e) =>
                      setCondoForm((f) => ({ ...f, operatingHours: e.target.value }))
                    }
                    placeholder="Ex: 08:00 – 22:00"
                  />
                  <Input
                    label="Limite de pedidos ativos simultâneos"
                    type="number"
                    min={1}
                    max={500}
                    value={condoForm.maxActiveDeliveries}
                    onChange={(e) =>
                      setCondoForm((f) => ({ ...f, maxActiveDeliveries: e.target.value }))
                    }
                    placeholder="Ex: 20"
                  />
                  <div className="pt-2">
                    <Button onClick={handleSaveCondo} disabled={savingCondo}>
                      {savingCondo ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </FieldGroup>
              )}
            </div>
          )}

          {/* ── Usuários (ADMIN) ──────────────────────────────────────────── */}
          {activeTab === 'usuarios' && (
            <div>
              <SectionTitle>Usuários do Condomínio</SectionTitle>

              {/* Filter tabs */}
              <div className="flex gap-2 mb-4">
                {(['ALL', 'RESIDENT', 'DELIVERY_PERSON'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setUserRoleFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      userRoleFilter === f
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'ALL' ? 'Todos' : f === 'RESIDENT' ? 'Moradores' : 'Entregadores'}
                    {f !== 'ALL' && (
                      <span className="ml-1 opacity-70">
                        ({condoUsers.filter((u) => u.role === f).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {loadingUsers ? (
                <p className="text-gray-400 text-sm">Carregando usuários...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">
                  Nenhum usuário encontrado.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        u.active ? 'border-gray-100 bg-white' : 'border-red-100 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                          {u.personalDocument && (
                            <p className="text-xs text-gray-500">
                              Documento: {formatPersonalDocument(u.personalDocument)}
                            </p>
                          )}
                          <div className="flex gap-2 mt-0.5">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLOR[u.role]}`}
                            >
                              {ROLE_LABELS[u.role] ?? u.role}
                            </span>
                            {u.role === 'RESIDENT' && u.apartment && (
                              <span className="text-xs text-gray-400">
                                Apto {u.apartment}
                                {u.block ? ` / Bloco ${u.block}` : ''}
                              </span>
                            )}
                            {!u.active && (
                              <span className="text-xs text-red-500 font-medium">Inativo</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {u.id !== user.id && (
                        <Button
                          size="sm"
                          variant={u.active ? 'secondary' : 'secondary'}
                          onClick={() => handleToggleUserStatus(u.id, !u.active)}
                          disabled={togglingUserId === u.id}
                        >
                          {togglingUserId === u.id
                            ? '...'
                            : u.active
                              ? 'Desativar'
                              : 'Ativar'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Código de Acesso (ADMIN) ──────────────────────────────── */}
          {activeTab === 'acesso' && (
            <div>
              <SectionTitle>Código de Acesso do Condomínio</SectionTitle>
              <p className="text-sm text-gray-500 mb-6">
                Compartilhe este código com moradores e entregadores para que eles possam se
                cadastrar no seu condomínio.
              </p>
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
                  ID do Condomínio
                </p>
                <p className="font-mono text-xl font-bold text-gray-800 break-all mb-4">
                  {user.condominiumId ?? '—'}
                </p>
                <Button onClick={handleCopyCondoId} variant="secondary">
                  {copied ? '✅ Copiado!' : '📋 Copiar código'}
                </Button>
              </div>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm font-medium text-blue-800 mb-1">Como usar</p>
                <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                  <li>Copie o código acima</li>
                  <li>Envie para os moradores ou entregadores</li>
                  <li>Na tela de cadastro, eles devem inserir o código no campo "ID do Condomínio"</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── Relatórios (ADMIN) ────────────────────────────────────── */}
          {activeTab === 'relatorios' && (
            <div>
              <SectionTitle>Relatórios</SectionTitle>
              <p className="text-sm text-gray-500 mb-6">
                Exporte os dados de entregas do seu condomínio para análise em planilhas.
              </p>

              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between p-5 border border-gray-200 rounded-xl bg-white">
                  <div>
                    <p className="font-semibold text-gray-800">📋 Histórico Completo de Entregas</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Exporta todas as entregas com morador, entregador, status, horários e
                      avaliações. Compatível com Excel e Google Sheets.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportCsv}
                    disabled={exportingCsv}
                    className="ml-4 shrink-0"
                  >
                    {exportingCsv ? 'Gerando...' : 'Baixar CSV'}
                  </Button>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-medium text-amber-800">Para dashboards em tempo real</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Acesse{' '}
                    <a href="/admin" className="underline font-medium">
                      Gestão do Condomínio
                    </a>{' '}
                    para visualizar métricas, demanda por hora/bloco e performance dos entregadores.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
    </div>
  );
}
