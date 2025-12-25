'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useI18n } from '@/lib/i18n/use-i18n';
import { usersService } from '@/lib/services/users';
import { useAvatar } from '@/lib/hooks/use-avatar';
import { paymentsService } from '@/lib/services/payments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FiUser, FiCreditCard, FiLock, FiGlobe, FiUpload, FiCheck } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/components/ui/toast';

const profileSchema = z.object({
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_]+$/),
  fullName: z.string().max(255).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu mới không khớp',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'security' | 'language'>('profile');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: subscriptions } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => paymentsService.getMySubscriptions(),
    enabled: activeTab === 'billing',
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        username: user.username || '',
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      // Don't set avatarPreview from user data - let useAvatar handle it
      setAvatarPreview(null);
    }
  }, [user, profileForm]);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const updateProfileMutation = useMutation({
    mutationFn: usersService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success(t('settings.profileSection.updateSuccess'));
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: usersService.changePassword,
    onSuccess: () => {
      passwordForm.reset();
      toast.success(t('settings.securitySection.changePasswordSuccess'));
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('settings.profileSection.avatarHint'));
        return;
      }
      
      // Validate file type - accept all image types including GIF and WebP
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error(t('common.error'));
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (data: ProfileFormData) => {
    try {
      let avatarUrl = user?.profileMetadata?.avatarUrl as string | undefined;
      
      if (avatarFile) {
        // Get upload URL from backend
        const { uploadUrl, key } = await usersService.getAvatarUploadUrl({
          fileName: avatarFile.name,
          contentType: avatarFile.type,
          fileSize: avatarFile.size,
        });

        // Upload file to MinIO using presigned URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: avatarFile,
          headers: {
            'Content-Type': avatarFile.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(t('common.error'));
        }

        // Save the storage key as avatarUrl
        avatarUrl = key;
      }

      await updateProfileMutation.mutateAsync({
        ...data,
        avatarUrl,
      });
      
      // Clear avatar file and preview after successful update
      setAvatarFile(null);
      setAvatarPreview(null);
      
      // Invalidate user query to refresh avatar
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch (error: any) {
      toast.error(error?.message || t('common.error'));
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    } catch (error: any) {
      toast.error(error?.message || t('common.error'));
    }
  };

  const tabs = [
    { id: 'profile' as const, label: t('settings.profile'), icon: FiUser },
    { id: 'billing' as const, label: t('settings.billing'), icon: FiCreditCard },
    { id: 'security' as const, label: t('settings.security'), icon: FiLock },
    { id: 'language' as const, label: t('settings.language'), icon: FiGlobe },
  ];

  // Load avatar URL from MinIO
  const avatarKey = user?.profileMetadata?.avatarUrl as string | undefined;
  const { avatarUrl } = useAvatar(avatarKey);
  const currentAvatar = avatarPreview || avatarUrl || null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">{t('settings.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {t('settings.profileSection.title')}
          </h2>

          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                    <FiUser className="w-12 h-12 text-zinc-500" />
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 transition"
                >
                  <FiUpload className="w-4 h-4 text-white" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-1">{t('settings.profileSection.avatar')}</p>
                <p className="text-xs text-zinc-500">{t('settings.profileSection.avatarHint')}</p>
              </div>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username">{t('settings.profileSection.username')}</Label>
              <Input
                id="username"
                {...profileForm.register('username')}
                className="mt-1"
              />
              {profileForm.formState.errors.username && (
                <p className="text-sm text-red-400 mt-1">
                  {profileForm.formState.errors.username.message}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <Label htmlFor="fullName">{t('settings.profileSection.fullName')}</Label>
              <Input
                id="fullName"
                {...profileForm.register('fullName')}
                className="mt-1"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">{t('settings.profileSection.email')}</Label>
              <Input
                id="email"
                type="email"
                {...profileForm.register('email')}
                className="mt-1"
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">{t('settings.profileSection.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                {...profileForm.register('phone')}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateProfileMutation.isPending ? t('common.loading') : t('settings.profileSection.updateProfile')}
            </Button>
          </form>
        </Card>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {t('settings.billingSection.title')}
          </h2>

          {subscriptions && subscriptions.length > 0 ? (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white capitalize">{sub.plan}</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        {new Date(sub.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {sub.amount.toLocaleString('vi-VN')}đ
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                          sub.status === 'completed'
                            ? 'text-green-400'
                            : sub.status === 'pending'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {t(`settings.billingSection.${sub.status}`)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-400 text-center py-8">
              {t('settings.billingSection.noHistory')}
            </p>
          )}
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {t('settings.securitySection.title')}
          </h2>

          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6 max-w-md">
            <div>
              <Label htmlFor="currentPassword">
                {t('settings.securitySection.currentPassword')}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                {...passwordForm.register('currentPassword')}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">
                {t('settings.securitySection.newPassword')}
              </Label>
              <Input
                id="newPassword"
                type="password"
                {...passwordForm.register('newPassword')}
                className="mt-1"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-red-400 mt-1">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">
                {t('settings.securitySection.confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                {...passwordForm.register('confirmPassword')}
                className="mt-1"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-400 mt-1">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {changePasswordMutation.isPending
                ? t('common.loading')
                : t('settings.securitySection.changePassword')}
            </Button>
          </form>
        </Card>
      )}

      {/* Language Tab */}
      {activeTab === 'language' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {t('settings.languageSection.title')}
          </h2>

          <div className="space-y-3 max-w-md">
            <button
              onClick={() => setLocale('vi')}
              className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                locale === 'vi'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">
                  {t('settings.languageSection.vietnamese')}
                </span>
                {locale === 'vi' && <FiCheck className="w-5 h-5 text-blue-400" />}
              </div>
            </button>

            <button
              onClick={() => setLocale('en')}
              className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                locale === 'en'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">
                  {t('settings.languageSection.english')}
                </span>
                {locale === 'en' && <FiCheck className="w-5 h-5 text-blue-400" />}
              </div>
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

