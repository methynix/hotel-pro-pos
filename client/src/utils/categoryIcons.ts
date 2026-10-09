import { IconType } from 'react-icons';
import {
  MdAttachMoney,
  MdBusinessCenter,
  MdCategory,
  MdComputer,
  MdDirectionsCar,
  MdFastfood,
  MdFlight,
  MdHome,
  MdLocalHospital,
  MdLocalOffer,
  MdLightbulb,
  MdPeople,
  MdSavings,
  MdSchool,
  MdShoppingCart,
  MdTrendingUp,
  MdWork,
  MdCampaign,
} from 'react-icons/md';

// Categories store an icon key; this maps it to the component to render.
export const CATEGORY_ICONS: Record<string, IconType> = {
  category: MdCategory,
  money: MdAttachMoney,
  salary: MdWork,
  business: MdBusinessCenter,
  investment: MdTrendingUp,
  savings: MdSavings,
  shopping: MdShoppingCart,
  food: MdFastfood,
  transport: MdDirectionsCar,
  travel: MdFlight,
  housing: MdHome,
  utilities: MdLightbulb,
  health: MdLocalHospital,
  education: MdSchool,
  software: MdComputer,
  payroll: MdPeople,
  marketing: MdCampaign,
  other: MdLocalOffer,
};

export const getCategoryIcon = (key?: string): IconType => (key && CATEGORY_ICONS[key]) || MdCategory;

export const CATEGORY_COLORS = [
  '#7E54FF',
  '#4A62A8',
  '#0EA5E9',
  '#16A34A',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#0D9488',
  '#505050',
];
