import { create } from 'zustand';
import { invitesService, Invite } from '@/lib/services/invites';

export type InviteFilter = 'all' | 'pending' | 'awaiting-response' | 'approved' | 'rejected';

interface InvitesState {
  // State
  invites: Invite[];
  selectedInvite: Invite | null;
  inviteLink: string | null;
  filter: InviteFilter;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchInvites: () => Promise<void>;
  createInvite: (role: 'user' | 'admin', maxUses: number, expiresAt: string) => Promise<Invite>;
  setSelectedInvite: (invite: Invite | null) => void;
  setInviteLink: (link: string | null) => void;
  setFilter: (filter: InviteFilter) => void;
  approveInvite: (inviteId: string, password: string, username?: string, message?: string) => Promise<Invite>;
  rejectInvite: (inviteId: string, reason?: string) => Promise<Invite>;
  revokeInvite: (inviteId: string) => Promise<Invite>;
  getByToken: (token: string) => Promise<Invite>;
  acceptInvite: (token: string, email: string, userFullName: string, userPhone: string) => Promise<Invite>;
}

export const useInvitesStore = create<InvitesState>((set) => ({
  // Initial state
  invites: [],
  selectedInvite: null,
  inviteLink: null,
  filter: 'all',
  isLoading: false,
  error: null,

  // Fetch all invites
  fetchInvites: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await invitesService.list({
        page: 1,
        limit: 100,
      });
      set({ invites: response.data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch invites' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Create new invite
  createInvite: async (role, maxUses, expiresAt) => {
    set({ isLoading: true, error: null });
    try {
      const invite = await invitesService.create({
        role,
        maxUses,
        expiresAt,
      });

      set((state) => ({
        invites: [invite, ...state.invites],
        inviteLink: `${typeof window !== 'undefined' ? window.location.origin : ''}/invites/accept/${invite.token}`,
      }));

      return invite;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create invite';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Set selected invite
  setSelectedInvite: (invite) => {
    set({ selectedInvite: invite });
  },

  // Set invite link
  setInviteLink: (link) => {
    set({ inviteLink: link });
  },

  // Set filter
  setFilter: (filter) => {
    set({ filter });
  },

  // Approve invite
  approveInvite: async (inviteId, password, username, message?) => {
    set({ isLoading: true, error: null });
    try {
      const invite = await invitesService.approve(inviteId, {
        password,
        username,
        message,
      });

      set((state) => ({
        invites: state.invites.map((inv) => (inv.id === inviteId ? invite : inv)),
        selectedInvite: null,
      }));

      return invite;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to approve invite';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Reject invite
  rejectInvite: async (inviteId, reason) => {
    set({ isLoading: true, error: null });
    try {
      const invite = await invitesService.reject(inviteId, { reason });

      set((state) => ({
        invites: state.invites.map((inv) => (inv.id === inviteId ? invite : inv)),
        selectedInvite: null,
      }));

      return invite;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to reject invite';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Revoke invite
  revokeInvite: async (inviteId) => {
    set({ isLoading: true, error: null });
    try {
      const invite = await invitesService.revoke(inviteId);

      set((state) => ({
        invites: state.invites.map((inv) => (inv.id === inviteId ? invite : inv)),
      }));

      return invite;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to revoke invite';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Get invite by token (for public use)
  getByToken: async (token) => {
    try {
      return await invitesService.getByToken(token);
    } catch (error) {
      throw error;
    }
  },

  // Accept invite (user submission)
  acceptInvite: async (token, email, userFullName, userPhone) => {
    try {
      return await invitesService.accept(token, {
        email,
        userFullName,
        userPhone,
      });
    } catch (error) {
      throw error;
    }
  },
}));
