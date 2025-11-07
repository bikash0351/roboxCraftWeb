
export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  category: 'Kits' | 'Components' | 'Recommendation';
  stock: number;
  firestoreId?: string;
  imageUrls?: string[];
  description?: string;
  shortDescription?: string;
  tags?: string[];
  kitContents?: string[];
}

export interface ProductRecommendation {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  costPrice?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  featuredImage: string;
  createdAt: any;
}

export interface Lesson {
    id: string;
    title: string;
    content: string; // HTML content
    videoUrl?: string;
    order: number;
}


export interface User {
  id: string;
  name: string;
  imageId: string;
}

export interface Reel {
  id: string;
  videoUrl: string;
  videoPath: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: any;
  uploaderName: string;
  uploaderImage: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string; // Stored as HTML
  featuredImage: string;
  excerpt: string;
  createdAt: any;
}

export const products: Product[] = [];
