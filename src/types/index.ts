export interface School {
  id: string;
  name: string;
  slug: string;
  type: SchoolType;
  category: SchoolCategory;
  gender: SchoolGender;
  description: string;
  shortDescription: string;
  logo: string;
  coverImage: string;
  gallery: string[];
  videos: string[];
  location: {
    address: string;
    city: string;
    region: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
    whatsapp?: string;
  };
  fees: {
    currency: string;
    dayMin: number;
    dayMax: number;
    boardingMin?: number;
    boardingMax?: number;
  };
  facilities: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  status: 'active' | 'pending' | 'rejected' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export type SchoolType = 'kindergarten' | 'primary' | 'secondary' | 'university' | 'daycare';
export type SchoolCategory = 'day' | 'boarding' | 'mixed';
export type SchoolGender = 'mixed' | 'girls_only' | 'boys_only';

export interface Review {
  id: string;
  schoolId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'guest' | 'user' | 'school' | 'admin';
  favorites: string[];
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'school' | 'admin';
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolSlug: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'closed';
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage?: ConversationMessage;
  messages?: ConversationMessage[];
}

export interface SearchFilters {
  query: string;
  type?: SchoolType;
  category?: SchoolCategory;
  gender?: SchoolGender;
  minFees?: number;
  maxFees?: number;
  facilities?: string[];
  rating?: number;
  sortBy?: 'relevance' | 'rating' | 'fees_low' | 'fees_high' | 'newest';
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly';
  features: string[];
  isFeatured: boolean;
}

export interface DashboardStats {
  totalViews: number;
  totalClicks: number;
  totalMessages: number;
  viewsTrend: number;
  clicksTrend: number;
  messagesTrend: number;
}

export interface AdminStats {
  totalUsers: number;
  totalSchools: number;
  totalRevenue: number;
  activeSubscriptions: number;
  pendingApprovals: number;
  totalReviews: number;
  flaggedReviews: number;
}
