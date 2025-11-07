

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
  imageId: string;
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

export const courses: Course[] = [
    { id: 'course001', title: 'Introduction to Robotics with Arduino', description: 'A beginner-friendly course to get started with electronics and programming.', imageId: 'course-arduino' },
    { id: 'course002', title: 'Advanced Robotics with Raspberry Pi', description: 'Learn to build complex robots with computer vision and AI.', imageId: 'course-raspberry-pi' },
    { id: 'course003', title: '3D Printing for Robotics', description: 'Design and print custom parts for your robotic projects.', imageId: 'course-3d-printing' },
];

export const products: Product[] = [];
