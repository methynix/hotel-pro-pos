import axiosInstance from './api';
import { ApiResponse, AuthResponse, AuthUser, Invitation, InvitationPreview, UserRole } from '../types';
import { getList, deleteOne } from './crud';

const BASE = '/invitations';

export interface CreatedInvitation {
  invitation: Invitation;
  /** Shareable link, for when email isn't configured or didn't arrive. */
  inviteUrl: string;
  emailed: boolean;
}

export const invitationService = {
  getPending: () => getList<Invitation>(BASE),

  async create(email: string, role: UserRole): Promise<CreatedInvitation> {
    const { data } = await axiosInstance.post<ApiResponse<CreatedInvitation>>(BASE, { email, role });
    return data.data;
  },

  revoke: (id: string) => deleteOne(`${BASE}/${id}`),

  async preview(token: string): Promise<InvitationPreview> {
    const { data } = await axiosInstance.get<ApiResponse<InvitationPreview>>(`${BASE}/token/${token}`);
    return data.data;
  },

  /** New users: creates the account and signs in. */
  async acceptAsNewUser(token: string, name: string, password: string) {
    const { data } = await axiosInstance.post<ApiResponse<AuthResponse>>(`${BASE}/token/${token}/accept`, { name, password });
    return data;
  },

  /** Signed-in users: joins the organization and makes it active. */
  async join(token: string): Promise<AuthUser> {
    const { data } = await axiosInstance.post<ApiResponse<AuthUser>>(`${BASE}/token/${token}/join`);
    return data.data;
  },
};
