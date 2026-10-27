import mongoose, { ClientSession } from 'mongoose';
import { Organization, IOrganization } from '../models/Organization';
import { Category } from '../models/Category';
import { User, IUser } from '../models/User';
import { UserRole } from '../types/api';

// Every new organization starts with a usable set of categories, since a
// transaction can't be recorded without one.
const DEFAULT_CATEGORIES: { name: string; type: 'income' | 'expense' }[] = [
  { name: 'Sales', type: 'income' },
  { name: 'Services', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Rent', type: 'expense' },
  { name: 'Salaries', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Supplies', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Other Expenses', type: 'expense' },
];

export const organizationService = {
  /**
   * Creates an organization with `user` as its admin and makes it their
   * active organization. Pass a session to make it part of a larger
   * transaction; the caller saves nothing else on `user` meanwhile.
   */
  async createForUser(name: string, user: IUser, session: ClientSession): Promise<IOrganization> {
    const [organization] = await Organization.create([{ name, createdBy: user._id }], { session });
    await Category.insertMany(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, organizationId: organization._id, createdBy: user._id })),
      { session }
    );
    user.organizations.push({ organizationId: organization._id, role: 'admin', joinedAt: new Date() });
    user.activeOrganizationId = organization._id;
    await user.save({ session });
    return organization;
  },

  /** Adds a membership (or updates the role of an existing one) and activates it. */
  addMember(user: IUser, organizationId: mongoose.Types.ObjectId, role: UserRole): void {
    const existing = user.organizations.find((m) => m.organizationId.equals(organizationId));
    if (existing) existing.role = role;
    else user.organizations.push({ organizationId, role, joinedAt: new Date() });
    user.activeOrganizationId = organizationId;
  },

  /** The signed-in user as the client sees it, including their organizations. */
  async toPublicUser(user: IUser) {
    const orgIds = user.organizations.map((m) => m.organizationId);
    const orgs = await Organization.find({ _id: { $in: orgIds } }).select('name baseCurrency').lean();
    const byId = new Map(orgs.map((o) => [o._id.toString(), o]));

    const organizations = user.organizations
      .filter((m) => byId.has(m.organizationId.toString()))
      .map((m) => {
        const org = byId.get(m.organizationId.toString())!;
        return { id: org._id.toString(), name: org.name, baseCurrency: org.baseCurrency, role: m.role };
      });
    const active = organizations.find((o) => o.id === user.activeOrganizationId?.toString()) ?? null;

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: active?.role ?? null,
      organization: active ? { id: active.id, name: active.name, baseCurrency: active.baseCurrency } : null,
      organizations,
      isActive: user.isActive,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };
  },

  /** Users holding one of `roles` in an organization, e.g. to notify its admins. */
  async membersWithRoles(organizationId: string, roles: UserRole[]): Promise<IUser[]> {
    const orgId = mongoose.isValidObjectId(organizationId)
      ? new mongoose.Types.ObjectId(organizationId)
      : organizationId;
    return User.find({
      isActive: true,
      organizations: { $elemMatch: { organizationId: orgId, role: { $in: roles } } },
    });
  },
};
