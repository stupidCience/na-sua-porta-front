'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Activity, Bell, Building2, ChartColumn, House, KeyRound, Link2, Bike, Shield, Star, Store, UserRound, Users } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
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
import type { AccountModule, Delivery, User, UserRole } from '@/lib/store';

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
type ActivatableModule = Exclude<UserRole, 'CONDOMINIUM_ADMIN'>;
type CondoUser = User & { active: boolean };

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

const TAB_ICONS: Record<AnyTab, LucideIcon> = {
  perfil: UserRound,
  endereco: House,
  vinculo: Link2,
  senha: Shield,
  avaliacoes: Star,
  notificacoes: Bell,
  veiculo: Bike,
  comercio: Store,
  disponibilidade: Activity,
  condominio: Building2,
  usuarios: Users,
  acesso: KeyRound,
  relatorios: ChartColumn,
};

const ROLE_LABELS: Record<string, string> = {
  RESIDENT: 'Morador',
  DELIVERY_PERSON: 'Entregador',
  VENDOR: 'Comerciante',
  CONDOMINIUM_ADMIN: 'Administrador',
};

const ROLE_COLOR: Record<string, string> = {
  RESIDENT: 'bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)]',
  DELIVERY_PERSON: 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]',
  VENDOR: 'bg-[rgba(31,41,51,0.06)] text-[var(--color-secondary)]',
  CONDOMINIUM_ADMIN: 'bg-[var(--color-background-soft)] text-[var(--color-secondary)]',
};

const MODULE_ICONS: Record<UserRole, LucideIcon> = {
  RESIDENT: House,
  DELIVERY_PERSON: Bike,
  VENDOR: Store,
  CONDOMINIUM_ADMIN: Building2,
};

const MODULE_DESCRIPTIONS: Record<UserRole, string> = {
  RESIDENT: 'Solicite coletas e faça pedidos no comércio interno do condomínio.',
  DELIVERY_PERSON: 'Aceite pedidos disponíveis, acompanhe rotas e confirme entregas com mais facilidade.',
  VENDOR: 'Cuide da sua loja, do cardápio e dos pedidos na mesma conta.',
  CONDOMINIUM_ADMIN: 'Acompanhe moradores, lojas e entregas do condomínio em um só lugar.',
};

function getResidentVerificationMeta(status?: User['residentVerificationStatus'] | null) {
  if (status === 'VERIFIED') {
    return {
      label: 'Verificado',
      className: 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]',
      helperText: 'Cadastro liberado para operar como morador.',
    };
  }

  if (status === 'PENDING_REVIEW') {
    return {
      label: 'Em análise',
      className: 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]',
      helperText: 'Documentos enviados. Aguarde a aprovação do condomínio.',
    };
  }

  if (status === 'REJECTED') {
    return {
      label: 'Rejeitado',
      className: 'bg-red-100 text-red-800',
      helperText: 'Atualize os documentos e envie novamente para análise.',
    };
  }

  return {
    label: 'Não enviado',
    className: 'bg-gray-100 text-gray-700',
    helperText: 'Complete os documentos para liberar seu perfil de morador.',
  };
}

// ─── Section components ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-xl font-semibold tracking-[-0.02em] text-[var(--color-secondary)]">{children}</h2>;
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, hasHydrated } = useAuthStore();
  const { emit } = useSocket(user?.id, user?.role, user?.condominiumId);
  const { addToast } = useToastStore();
  const initializedTabFromQueryRef = useRef(false);
  const inviteQrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const tabs: AnyTab[] =
    user?.role === 'RESIDENT'
      ? ['perfil', 'endereco', 'vinculo', 'senha', 'avaliacoes', 'notificacoes']
      : user?.role === 'DELIVERY_PERSON'
        ? ['perfil', 'veiculo', 'disponibilidade', 'vinculo', 'senha']
        : user?.role === 'VENDOR'
          ? ['perfil', 'comercio', 'vinculo', 'senha']
        : ['perfil', 'senha', 'condominio', 'usuarios', 'acesso', 'relatorios'];

  const [activeTab, setActiveTab] = useState<AnyTab>('perfil');
  const [accountModules, setAccountModules] = useState<AccountModule[]>(
    user?.modules ?? [],
  );

  // ── Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    personalDocument: '',
    residenceDocument: '',
    communicationsConsent: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Vendor documents (VENDOR)
  const [vendorDocs, setVendorDocs] = useState({
    vendorCnpj: '',
    vendorCnae: '',
    vendorLegalDocument: '',
  });
  const [vendorModuleForm, setVendorModuleForm] = useState({
    vendorName: '',
    vendorCategory: '',
    vendorDescription: '',
    vendorContactPhone: '',
  });
  const [activatingModule, setActivatingModule] = useState<ActivatableModule | null>(null);
  const [switchingModule, setSwitchingModule] = useState<UserRole | null>(null);

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
  const [adminInviteUrl, setAdminInviteUrl] = useState('');
  const [browserOrigin, setBrowserOrigin] = useState('');
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
  const [condoUsers, setCondoUsers] = useState<CondoUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [reviewingResidentKey, setReviewingResidentKey] = useState<string | null>(null);
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
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  const currentAccessCode = user?.condominiumAccessCode || user?.condominiumId || '';
  const inviteLink = adminInviteUrl
    ? adminInviteUrl
    : browserOrigin && currentAccessCode
    ? `${browserOrigin}/register?invite=${encodeURIComponent(currentAccessCode)}`
    : '';
  const whatsappInviteMessage = inviteLink
    ? [
        `Convite do condomínio${user?.condominiumName ? ` ${user.condominiumName}` : ''}`,
        currentAccessCode ? `Código de acesso: ${currentAccessCode}` : '',
        `Cadastro: ${inviteLink}`,
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const applySafeUserResponse = (nextUser: Partial<User>) => {
    if (!user) {
      return null;
    }

    const mergedUser: User = {
      ...user,
      ...nextUser,
    };

    setUser(mergedUser);
    setAccountModules(mergedUser.modules ?? []);
    setLinkCondominiumCode(
      mergedUser.condominiumAccessCode ?? mergedUser.condominiumId ?? '',
    );

    return mergedUser;
  };

  // ─ Initialise from user/localStorage
  useEffect(() => {
    const fallbackTab = tabs[0];

    if (!tabs.includes(activeTab)) {
      setActiveTab(fallbackTab);
      return;
    }

    if (!hasHydrated || !user || initializedTabFromQueryRef.current) {
      return;
    }

    initializedTabFromQueryRef.current = true;

    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const requestedTab = url.searchParams.get('tab');

    if (requestedTab && tabs.includes(requestedTab as AnyTab)) {
      setActiveTab(requestedTab as AnyTab);
      url.searchParams.delete('tab');
      const nextSearch = url.searchParams.toString();
      const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [activeTab, hasHydrated, tabs, user]);

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
      residenceDocument: user.residenceDocument ?? '',
      communicationsConsent: user.communicationsConsent ?? false,
    });
    setAccountModules(user.modules ?? []);
    setVendorModuleForm({
      vendorName: '',
      vendorCategory: '',
      vendorDescription: '',
      vendorContactPhone: user.phone ?? '',
    });
    setAddressForm({ apartment: user.apartment ?? '', block: user.block ?? '' });
    setVehicleForm({ vehicleInfo: user.vehicleInfo ?? '' });
    setLinkCondominiumCode(user.condominiumAccessCode ?? user.condominiumId ?? '');
    setAdminInviteUrl('');

    if (typeof window !== 'undefined') {
      setBrowserOrigin(window.location.origin);
      setIsAvailable(localStorage.getItem('nsp_availability') !== 'offline');
      setNotifSound(localStorage.getItem('nsp_notif_sound') !== 'off');
      setNotifBanner(localStorage.getItem('nsp_notif_banner') !== 'off');
    }

    let cancelled = false;

    usersAPI
      .getMe()
      .then((res) => {
        if (cancelled) return;

        if (!user.modules?.length && res.data?.modules) {
          setUser({ ...user, ...res.data });
        }

        setAccountModules(res.data?.modules ?? []);

        setProfileForm({
          name: res.data?.name ?? user.name ?? '',
          phone: res.data?.phone ?? '',
          personalDocument: res.data?.personalDocument ?? '',
          residenceDocument: res.data?.residenceDocument ?? '',
          communicationsConsent: res.data?.communicationsConsent ?? false,
        });
        setAddressForm({
          apartment: res.data?.apartment ?? '',
          block: res.data?.block ?? '',
        });
        setVehicleForm({ vehicleInfo: res.data?.vehicleInfo ?? '' });
        setLinkCondominiumCode(
          res.data?.condominiumAccessCode ??
            res.data?.condominiumId ??
            user.condominiumAccessCode ??
            user.condominiumId ??
            '',
        );
        setVendorModuleForm((current) => ({
          ...current,
          vendorContactPhone: res.data?.phone ?? current.vendorContactPhone,
        }));
      })
      .catch(() => {
        // Keep page functional even if profile refresh fails.
      });

    if (user.role === 'CONDOMINIUM_ADMIN' && user.condominiumId) {
      condominiumsAPI
        .getMyAccessCode()
        .then((res) => {
          if (cancelled) return;

          setAdminInviteUrl(res.data?.inviteUrl ?? '');
          setLinkCondominiumCode(
            res.data?.accessCode ?? user.condominiumAccessCode ?? user.condominiumId ?? '',
          );
          setUser({
            ...user,
            condominiumAccessCode:
              res.data?.accessCode ?? user.condominiumAccessCode ?? user.condominiumId ?? null,
          });
        })
        .catch(() => {
          // Keep access tab usable even if access code backfill fails.
        });
    }

    if (user.role === 'VENDOR') {
      vendorsAPI
        .getMe()
        .then((res) => {
          setVendorDocs({
            vendorCnpj: res.data?.cnpj ?? '',
            vendorCnae: res.data?.cnae ?? '',
            vendorLegalDocument: res.data?.legalRepresentativeDocument ?? '',
          });
          setVendorModuleForm({
            vendorName: res.data?.name ?? '',
            vendorCategory: res.data?.category ?? '',
            vendorDescription: res.data?.description ?? '',
            vendorContactPhone: res.data?.contactPhone ?? user.phone ?? '',
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    if (user?.role === 'RESIDENT' && !profileForm.phone.trim()) {
      addToast('Telefone ou WhatsApp é obrigatório para moradores.', 'error');
      return;
    }
    if (user?.role === 'RESIDENT' && !profileForm.communicationsConsent) {
      addToast('Autorize comunicações para concluir o cadastro do morador.', 'error');
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
      let safeUserPayload = (
        await usersAPI.updateMe({
          name: profileForm.name,
          phone: profileForm.phone,
          personalDocument: profileForm.personalDocument,
          residenceDocument: profileForm.residenceDocument,
          communicationsConsent: profileForm.communicationsConsent,
        })
      ).data;

      if (user?.role === 'VENDOR') {
        safeUserPayload = (
          await usersAPI.updateDocuments({
            vendorCnpj: vendorDocs.vendorCnpj,
            vendorCnae: vendorDocs.vendorCnae,
            vendorLegalDocument: vendorDocs.vendorLegalDocument,
          })
        ).data;
      }

      applySafeUserResponse(safeUserPayload);
      addToast('✅ Perfil atualizado com sucesso!', 'success');
    } catch (err: unknown) {
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
      applySafeUserResponse(res.data);
      addToast('🏠 Endereço atualizado com sucesso!', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos salvar seu endereço agora.'), 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveVehicle = async () => {
    setSavingVehicle(true);
    try {
      const res = await usersAPI.updateMe({ vehicleInfo: vehicleForm.vehicleInfo });
      applySafeUserResponse(res.data);
      addToast('🛵 Dados do veículo salvos com sucesso!', 'success');
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos alterar sua senha agora.'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLinkCondominium = async () => {
    if (!linkCondominiumCode.trim()) {
      addToast('Informe o código de acesso do condomínio para vincular sua conta.', 'error');
      return;
    }

    setLinkingCondominium(true);
    try {
      const res = await usersAPI.linkToCondominium(linkCondominiumCode.trim());
      applySafeUserResponse(res.data);
      setLinkCondominiumCode(
        res.data.condominiumAccessCode ??
          res.data.condominiumId ??
          linkCondominiumCode.trim(),
      );
      addToast('🏢 Vínculo com o condomínio atualizado com sucesso!', 'success');
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos alterar o status do usuário agora.'), 'error');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleReviewResidentVerification = async (
    targetId: string,
    status: 'VERIFIED' | 'REJECTED',
  ) => {
    const reviewKey = `${targetId}:${status}`;
    setReviewingResidentKey(reviewKey);

    try {
      const res = await usersAPI.reviewResidentVerification(targetId, status);
      setCondoUsers((prev) =>
        prev.map((resident) =>
          resident.id === targetId
            ? {
                ...resident,
                residentVerificationStatus: res.data.residentVerificationStatus,
              }
            : resident,
        ),
      );
      addToast(
        status === 'VERIFIED'
          ? '✅ Cadastro do morador aprovado com sucesso'
          : '⚠️ Cadastro do morador marcado como rejeitado',
        'success',
      );
    } catch (err: unknown) {
      addToast(
        getApiErrorMessage(err, 'Não conseguimos revisar o cadastro do morador agora.'),
        'error',
      );
    } finally {
      setReviewingResidentKey(null);
    }
  };

  const handleSwitchModule = async (module: UserRole) => {
    setSwitchingModule(module);

    try {
      const res = await usersAPI.switchActiveModule(module);
      applySafeUserResponse(res.data);
      addToast(`🔁 Perfil alterado para ${ROLE_LABELS[module].toLowerCase()}.`, 'success');
    } catch (err: unknown) {
      addToast(
        getApiErrorMessage(err, 'Não conseguimos trocar de perfil agora.'),
        'error',
      );
    } finally {
      setSwitchingModule(null);
    }
  };

  const handleActivateModule = async (module: ActivatableModule) => {
    setActivatingModule(module);

    try {
      const res = await usersAPI.activateModule(module, {
        phone: profileForm.phone,
        apartment: addressForm.apartment,
        block: addressForm.block,
        communicationsConsent: profileForm.communicationsConsent,
        personalDocument: profileForm.personalDocument,
        residenceDocument: profileForm.residenceDocument,
        vehicleInfo: vehicleForm.vehicleInfo,
        condominiumCode: linkCondominiumCode.trim() || undefined,
        vendorName: vendorModuleForm.vendorName,
        vendorCategory: vendorModuleForm.vendorCategory,
        vendorDescription: vendorModuleForm.vendorDescription,
        vendorCnpj: vendorDocs.vendorCnpj,
        vendorCnae: vendorDocs.vendorCnae,
        vendorLegalDocument: vendorDocs.vendorLegalDocument,
        vendorContactPhone:
          vendorModuleForm.vendorContactPhone || profileForm.phone || undefined,
      });

      const nextUser = applySafeUserResponse(res.data);
      const nextModule = nextUser?.modules?.find((item) => item.module === module);

      if (
        module === 'RESIDENT' &&
        nextUser?.residentVerificationStatus === 'PENDING_REVIEW'
      ) {
        addToast('📄 Documentos enviados para análise do condomínio.', 'info');
        return;
      }

      if (nextModule?.enabled) {
        addToast(`✅ Perfil de ${ROLE_LABELS[module].toLowerCase()} pronto para uso.`, 'success');
        return;
      }

      addToast(
        '🧩 Progresso salvo. Revise o que falta para concluir esse perfil.',
        'info',
      );
    } catch (err: unknown) {
      addToast(
        getApiErrorMessage(err, 'Não conseguimos atualizar esse perfil agora.'),
        'error',
      );
    } finally {
      setActivatingModule(null);
    }
  };

  const handleCopyCondoId = () => {
    if (currentAccessCode) {
      navigator.clipboard.writeText(currentAccessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyInviteLink = () => {
    if (!inviteLink) {
      return;
    }

    navigator.clipboard.writeText(inviteLink);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2000);
  };

  const handleDownloadInviteQr = () => {
    if (!inviteLink || !inviteQrCanvasRef.current) {
      addToast('Não há QR Code disponível para baixar ainda.', 'error');
      return;
    }

    const downloadUrl = inviteQrCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `convite-condominio-${currentAccessCode || 'nsp'}.png`;
    link.click();
    addToast('🖼️ QR Code baixado com sucesso!', 'success');
  };

  const handleShareInviteOnWhatsApp = () => {
    if (!inviteLink || !whatsappInviteMessage) {
      addToast('Não há link de convite disponível para compartilhar ainda.', 'error');
      return;
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappInviteMessage)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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
    } catch (err: unknown) {
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
  const residentVerificationMeta = getResidentVerificationMeta(
    user.residentVerificationStatus,
  );
  const enabledModulesCount = accountModules.filter((module) => module.enabled).length;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
        <Card className="rounded-[32px] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={user.name} size="xl" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.03em] text-[var(--color-secondary)]">{user.name}</h1>
              <p className="mt-2 text-sm text-[var(--color-foreground-soft)] sm:text-base">{user.email}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium sm:text-sm">
                <span className={`rounded-full px-3 py-1.5 ${ROLE_COLOR[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
                {user.condominiumName && (
                  <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-[var(--color-secondary)]">
                    {user.condominiumName}
                  </span>
                )}
                {accountModules.length > 0 && (
                  <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] px-3 py-1.5 text-[var(--color-foreground-soft)]">
                    {enabledModulesCount} perfil{enabledModulesCount === 1 ? '' : 's'} liberado{enabledModulesCount === 1 ? '' : 's'}
                  </span>
                )}
                {user.role === 'RESIDENT' && user.apartment && (
                  <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-[var(--color-secondary)]">
                    Apto {user.apartment}
                    {user.block ? ` / Bloco ${user.block}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="horizontal-scroller pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm'
                  : 'border-[var(--color-line)] bg-white text-[var(--color-foreground-soft)] hover:bg-[var(--color-background-soft)] hover:text-[var(--color-primary-dark)]'
              }`}
            >
              {(() => {
                const TabIcon = TAB_ICONS[tab];
                return <TabIcon className="h-4 w-4" />;
              })()}
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <Card className="rounded-[32px] p-5 sm:p-8">

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
                  <p className="rounded-lg border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-2 text-sm text-[var(--color-foreground-soft)]">
                    {user.email}
                    <span className="ml-2 text-xs text-[var(--color-foreground-soft)]">(não editável)</span>
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
                  <p className="-mt-2 text-xs text-[var(--color-secondary)]">
                    Este campo é obrigatório para entregadores.
                  </p>
                )}

                {user.role === 'RESIDENT' && (
                  <>
                    <Input
                      label="Comprovante de residência (referência)"
                      value={profileForm.residenceDocument}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          residenceDocument: e.target.value,
                        }))
                      }
                      placeholder="Ex: Conta de luz, gás ou condomínio"
                    />

                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-gray-700">Status da verificação</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${residentVerificationMeta.className}`}>
                          {residentVerificationMeta.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {residentVerificationMeta.helperText}
                      </p>
                      <label className="mt-3 flex items-start gap-3 text-gray-700">
                        <input
                          type="checkbox"
                          checked={profileForm.communicationsConsent}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              communicationsConsent: e.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <span>
                          Autorizo comunicações sobre pedidos, entregas e avisos importantes do condomínio.
                        </span>
                      </label>
                    </div>
                  </>
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

                {user.role !== 'CONDOMINIUM_ADMIN' && accountModules.length > 0 && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-800">Sua conta e seus perfis</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Use a mesma conta em mais de um perfil e troque sempre que precisar.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {accountModules.map((module) => {
                        const isResidentModule = module.module === 'RESIDENT';
                        const isDeliveryModule = module.module === 'DELIVERY_PERSON';
                        const isVendorModule = module.module === 'VENDOR';
                        const ModuleIcon = MODULE_ICONS[module.module];
                        const isPendingResidentApproval =
                          isResidentModule && user.residentVerificationStatus === 'PENDING_REVIEW';
                        const moduleBorderClass = module.active
                          ? 'border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)]'
                          : module.enabled
                            ? 'border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)]'
                            : 'border-gray-200 bg-gray-50';
                        const moduleBadgeClass = module.active
                          ? 'bg-[rgba(255,213,58,0.28)] text-[var(--color-secondary)]'
                          : module.enabled
                            ? 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]'
                            : 'bg-gray-200 text-gray-700';
                        const moduleActionLabel = module.enabled
                          ? module.active
                            ? 'Perfil em uso'
                            : 'Usar perfil'
                          : isResidentModule
                            ? user.residentVerificationStatus === 'REJECTED'
                              ? 'Reenviar para análise'
                              : 'Salvar e revisar perfil'
                            : 'Salvar e ativar perfil';

                        return (
                          <div
                            key={module.module}
                            className={`rounded-2xl border p-4 ${moduleBorderClass}`}
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-[var(--color-primary-dark)] ring-1 ring-black/5">
                                    <ModuleIcon className="h-4.5 w-4.5" />
                                  </span>
                                  <h4 className="text-base font-semibold text-gray-800">
                                    {ROLE_LABELS[module.module]}
                                  </h4>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${moduleBadgeClass}`}>
                                    {module.active ? 'Ativo' : module.enabled ? 'Liberado' : 'Pendente'}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-600">
                                  {MODULE_DESCRIPTIONS[module.module]}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {module.enabled && !module.active && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleSwitchModule(module.module)}
                                    loading={switchingModule === module.module}
                                  >
                                    {moduleActionLabel}
                                  </Button>
                                )}

                                {module.active && module.enabled && (
                                  <Button size="sm" variant="secondary" disabled>
                                    {moduleActionLabel}
                                  </Button>
                                )}

                                {!module.enabled && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleActivateModule(module.module as ActivatableModule)}
                                    loading={activatingModule === module.module}
                                    disabled={isPendingResidentApproval}
                                  >
                                    {isPendingResidentApproval ? 'Aguardando aprovação' : moduleActionLabel}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {module.missingRequirements.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {module.missingRequirements.map((requirement) => (
                                  <span
                                    key={`${module.module}-${requirement}`}
                                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
                                  >
                                    {requirement}
                                  </span>
                                ))}
                              </div>
                            )}

                            {isResidentModule && !module.enabled && (
                              <p className="mt-4 text-sm text-gray-600">
                                {residentVerificationMeta.helperText}
                              </p>
                            )}

                            {isDeliveryModule && !module.enabled && (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <Input
                                  label="Documento do entregador"
                                  value={profileForm.personalDocument}
                                  onChange={(e) =>
                                    setProfileForm((current) => ({
                                      ...current,
                                      personalDocument: formatPersonalDocument(e.target.value),
                                    }))
                                  }
                                  placeholder="RG ou CPF"
                                />
                                <Input
                                  label="Veículo"
                                  value={vehicleForm.vehicleInfo}
                                  onChange={(e) =>
                                    setVehicleForm({ vehicleInfo: e.target.value })
                                  }
                                  placeholder="Ex: Moto Honda CG 160 - ABC1D23"
                                />
                              </div>
                            )}

                            {isVendorModule && (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <Input
                                  label="Nome do comércio"
                                  value={vendorModuleForm.vendorName}
                                  onChange={(e) =>
                                    setVendorModuleForm((current) => ({
                                      ...current,
                                      vendorName: e.target.value,
                                    }))
                                  }
                                  placeholder="Ex: Lanches da Praça"
                                />
                                <Input
                                  label="Categoria"
                                  value={vendorModuleForm.vendorCategory}
                                  onChange={(e) =>
                                    setVendorModuleForm((current) => ({
                                      ...current,
                                      vendorCategory: e.target.value,
                                    }))
                                  }
                                  placeholder="Ex: Lanchonete"
                                />
                                <Input
                                  label="Telefone do comércio"
                                  value={vendorModuleForm.vendorContactPhone}
                                  onChange={(e) =>
                                    setVendorModuleForm((current) => ({
                                      ...current,
                                      vendorContactPhone: e.target.value,
                                    }))
                                  }
                                  placeholder="(11) 99999-9999"
                                />
                                <Input
                                  label="CNPJ"
                                  value={vendorDocs.vendorCnpj}
                                  onChange={(e) =>
                                    setVendorDocs((current) => ({
                                      ...current,
                                      vendorCnpj: e.target.value,
                                    }))
                                  }
                                  placeholder="00.000.000/0000-00"
                                />
                                <Input
                                  label="CNAE"
                                  value={vendorDocs.vendorCnae}
                                  onChange={(e) =>
                                    setVendorDocs((current) => ({
                                      ...current,
                                      vendorCnae: e.target.value,
                                    }))
                                  }
                                  placeholder="Ex: 5611-2/01"
                                />
                                <Input
                                  label="Documento do responsável"
                                  value={vendorDocs.vendorLegalDocument}
                                  onChange={(e) =>
                                    setVendorDocs((current) => ({
                                      ...current,
                                      vendorLegalDocument: e.target.value,
                                    }))
                                  }
                                  placeholder="RG/CPF do responsável"
                                />
                                <div className="md:col-span-2">
                                  <Input
                                    label="Descrição"
                                    value={vendorModuleForm.vendorDescription}
                                    onChange={(e) =>
                                      setVendorModuleForm((current) => ({
                                        ...current,
                                        vendorDescription: e.target.value,
                                      }))
                                    }
                                    placeholder="O que seu comércio oferece"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </FieldGroup>
            </div>
          )}

          {activeTab === 'comercio' && (
            <div>
              <SectionTitle>Meu Comércio</SectionTitle>
              <p className="text-sm text-gray-500 mb-4">
                Use esta área para gerenciar cardápio, pedidos e o andamento da sua loja.
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
                  <p className="text-xs text-emerald-700 mt-1">
                    Código atual: {user.condominiumAccessCode || user.condominiumId}
                  </p>
                </div>
              )}

              <FieldGroup>
                <Input
                  label="Código de acesso do condomínio"
                  value={linkCondominiumCode}
                  onChange={(e) => setLinkCondominiumCode(e.target.value)}
                  placeholder="Ex: copie o código compartilhado pelo condomínio"
                />
                <div className="pt-2">
                  <Button onClick={handleLinkCondominium} disabled={linkingCondominium}>
                    {linkingCondominium ? 'Vinculando...' : 'Vincular ao Condomínio'}
                  </Button>
                </div>
              </FieldGroup>

              {user.role === 'CONDOMINIUM_ADMIN' && (
                <p className="mt-4 text-xs text-[var(--color-secondary)]">
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
                        value ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
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

              <div className="mb-4 rounded-xl border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] px-4 py-3 text-sm text-[var(--color-secondary)]">
                Cadastros de moradores só ficam prontos para uso depois da revisão documental.
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 mb-4">
                {(['ALL', 'RESIDENT', 'DELIVERY_PERSON'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setUserRoleFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      userRoleFilter === f
                        ? 'bg-[var(--color-primary)] text-white'
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
                  {filteredUsers.map((u) => {
                    const residentReviewMeta = getResidentVerificationMeta(
                      u.residentVerificationStatus,
                    );

                    return (
                      <div
                        key={u.id}
                        className={`flex flex-col gap-4 rounded-lg border p-3 transition-colors md:flex-row md:items-center md:justify-between ${
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
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLOR[u.role]}`}
                              >
                                {ROLE_LABELS[u.role] ?? u.role}
                              </span>
                              {u.role === 'RESIDENT' && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded-full ${residentReviewMeta.className}`}
                                >
                                  {residentReviewMeta.label}
                                </span>
                              )}
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
                          <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            {u.role === 'RESIDENT' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewResidentVerification(u.id, 'VERIFIED')}
                                  loading={reviewingResidentKey === `${u.id}:VERIFIED`}
                                  disabled={u.residentVerificationStatus === 'VERIFIED'}
                                >
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleReviewResidentVerification(u.id, 'REJECTED')}
                                  loading={reviewingResidentKey === `${u.id}:REJECTED`}
                                  disabled={u.residentVerificationStatus === 'REJECTED'}
                                >
                                  Rejeitar
                                </Button>
                              </>
                            )}

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleToggleUserStatus(u.id, !u.active)}
                              disabled={togglingUserId === u.id}
                            >
                              {togglingUserId === u.id
                                ? '...'
                                : u.active
                                  ? 'Desativar'
                                  : 'Ativar'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  Código de acesso do condomínio
                </p>
                <p className="font-mono text-xl font-bold text-gray-800 break-all mb-4">
                  {currentAccessCode || '—'}
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button onClick={handleCopyCondoId} variant="secondary">
                    {copied ? '✅ Copiado!' : '📋 Copiar código'}
                  </Button>
                  <Button
                    onClick={handleCopyInviteLink}
                    variant="secondary"
                    disabled={!inviteLink}
                  >
                    {copiedInviteLink ? '✅ Link copiado!' : '🔗 Copiar link'}
                  </Button>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4 text-center">
                  QR Code do convite
                </p>
                {inviteLink ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <QRCodeCanvas
                        ref={inviteQrCanvasRef}
                        value={inviteLink}
                        size={200}
                        marginSize={2}
                        bgColor="#FFFFFF"
                        fgColor="#111827"
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <Button onClick={handleDownloadInviteQr} variant="secondary">
                        🖼️ Baixar QR em PNG
                      </Button>
                      <Button onClick={handleShareInviteOnWhatsApp} variant="secondary">
                        📱 Compartilhar no WhatsApp
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 text-center max-w-md">
                      Quem escanear esse QR Code será levado direto para o cadastro com o convite do condomínio preenchido.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center">
                    O QR Code será exibido quando houver um link de convite disponível.
                  </p>
                )}
              </div>
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Link de convite
                </p>
                <p className="break-all text-sm text-gray-700">
                  {inviteLink || 'O link de convite será exibido quando houver um código disponível.'}
                </p>
              </div>
              <div className="mt-6 rounded-xl border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] p-4">
                <p className="mb-1 text-sm font-medium text-[var(--color-primary-dark)]">Como usar</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--color-secondary)]">
                  <li>Copie o código acima</li>
                  <li>Ou compartilhe o link completo, ou o QR Code, com moradores e entregadores</li>
                  <li>Na tela de cadastro, eles podem usar o convite automaticamente ou inserir o código no campo &quot;Código de acesso do condomínio&quot;</li>
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

                <div className="rounded-xl border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] p-4">
                  <p className="text-sm font-medium text-[var(--color-primary-dark)]">Para acompanhar indicadores ao vivo</p>
                  <p className="mt-1 text-sm text-[var(--color-secondary)]">
                    Acesse{' '}
                    <a href="/admin" className="underline font-medium">
                      Gestão do Condomínio
                    </a>{' '}
                    para visualizar métricas, movimento por hora e por bloco, além do desempenho dos entregadores.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
    </div>
  );
}
