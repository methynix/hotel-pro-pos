import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserRole } from '../types/api';

export interface IUserPreferences {
  currency: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  emailNotifications: boolean;
  budgetAlerts: boolean;
  weeklySummary: boolean;
}

export interface IMembership {
  organizationId: mongoose.Types.ObjectId;
  role: UserRole;
  joinedAt: Date;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  /** A user's role is per organization, never global. */
  organizations: IMembership[];
  activeOrganizationId?: mongoose.Types.ObjectId | null;
  isActive: boolean;
  preferences: IUserPreferences;
  lastWeeklySummaryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    organizations: [
      {
        _id: false,
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        role: {
          type: String,
          enum: { values: ['admin', 'manager', 'viewer', 'operator'], message: 'Invalid role' },
          required: true,
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    activeOrganizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    isActive: {
      type: Boolean,
      default: true,
    },
    preferences: {
      currency: { type: String, default: 'TZS' },
      dateFormat: {
        type: String,
        enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
        default: 'MM/DD/YYYY',
      },
      emailNotifications: { type: Boolean, default: true },
      budgetAlerts: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: false },
    },
    lastWeeklySummaryAt: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.index({ 'organizations.organizationId': 1 });

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
