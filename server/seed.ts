import { encryptSecret } from "./crypto";
import { AUTHHUB_SERVICE } from "@shared/constants";
import crypto from "crypto";

export interface DefaultService {
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
  isSystem?: boolean;
}

export const DEFAULT_SERVICES: DefaultService[] = [
  {
    name: AUTHHUB_SERVICE.name,
    description: AUTHHUB_SERVICE.description,
    url: AUTHHUB_SERVICE.url,
    icon: AUTHHUB_SERVICE.icon,
    color: AUTHHUB_SERVICE.color,
    isSystem: true,
  },
  {
    name: "Git Garden",
    description: "Git-based portfolio-as-a-service platform",
    url: "https://ts-git-garden.replit.app",
    icon: "Sprout",
    color: "#4f46e5",
  },
  {
    name: "Iron Path",
    description: "Fitness tracking and workout planning platform",
    url: "https://ts-iron-path.replit.app",
    icon: "TrendingUp",
    color: "#059669",
  },
  {
    name: "PurpleGreen",
    description: "Wealth management system for financial and accounting",
    url: "https://ts-purple-green.replit.app",
    icon: "DollarSign",
    color: "#8b5cf6",
  },
  {
    name: "BTCPay Dashboard",
    description: "Bitcoin payment processing and merchant tools",
    url: "https://ts-btcpay-dashboard.replit.app",
    icon: "Bitcoin",
    color: "#f59e0b",
  },
  {
    name: "Quest Armory",
    description: "Questing system with challenges and achievements",
    url: "https://ts-quest-armory.replit.app",
    icon: "Swords",
    color: "hsl(var(--primary))",
  },
  {
    name: "Git Healthz",
    description: "Service-wide health checks and monitoring",
    url: "https://ts-git-healthz.replit.app",
    icon: "Activity",
    color: "hsl(var(--primary))",
  },
  {
    name: "Academia Vault",
    description: "Academic resources and knowledge management",
    url: "https://ts-academia-vault.replit.app",
    icon: "BookOpen",
    color: "hsl(var(--primary))",
  },
];

export function generateServiceSecret(): { secret: string; secretPreview: string; encryptedSecret: string } {
  const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
  const encryptedSecret = encryptSecret(plaintextSecret);
  const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;
  
  return {
    secret: plaintextSecret,
    secretPreview,
    encryptedSecret,
  };
}
