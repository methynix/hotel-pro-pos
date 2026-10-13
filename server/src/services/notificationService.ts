import { Notification, NotificationCategory } from '../models/Notification';
import { User, IUser } from '../models/User';
import { emailService, renderEmail } from './emailService';

interface NotifyInput {
  category: NotificationCategory;
  title: string;
  message: string;
  link?: string;
  /** Email body; defaults to the in-app message. */
  email?: {
    subject?: string;
    paragraphs?: string[];
    rows?: { label: string; value: string }[];
    actionLabel?: string;
  };
}

// Which user preference controls each kind of email. Security emails
// (password changes, deactivation) are always sent.
const shouldEmail = (user: IUser, category: NotificationCategory): boolean => {
  const prefs = user.preferences || ({} as IUser['preferences']);
  switch (category) {
    case 'security':
      return true;
    case 'account':
      return prefs.emailNotifications !== false;
    case 'budget':
      return prefs.budgetAlerts !== false;
    case 'summary':
      return prefs.weeklySummary === true;
  }
};

export const notificationService = {
  /**
   * Records an in-app notification and, if the user's preferences allow it,
   * emails them from the Methynix address. Never throws.
   */
  async notify(userOrId: IUser | string, input: NotifyInput): Promise<void> {
    try {
      const user = typeof userOrId === 'string' ? await User.findById(userOrId) : userOrId;
      if (!user) return;

      const notification = await Notification.create({
        userId: user._id,
        category: input.category,
        title: input.title,
        message: input.message,
        link: input.link,
      });

      if (!user.isActive && input.category !== 'security') return;
      if (!shouldEmail(user, input.category)) return;

      const html = renderEmail({
        heading: input.title,
        paragraphs: [`Hi ${user.name.split(' ')[0]},`, ...(input.email?.paragraphs ?? [input.message])],
        rows: input.email?.rows,
        action: input.link ? { label: input.email?.actionLabel || 'Open ledgerHQ', path: input.link } : undefined,
      });
      const sent = await emailService.send(user.email, input.email?.subject || input.title, html);
      if (sent) {
        notification.emailed = true;
        await notification.save();
      }
    } catch (error) {
      console.error('Notification failed:', error instanceof Error ? error.message : error);
    }
  },
};
