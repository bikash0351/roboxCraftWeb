

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  imageIds: string[];
  category: 'Kits' | 'Components' | 'Recommendation';
  stock: number;
  firestoreId?: string;
  imageUrl?: string;
  description?: string;
  shortDescription?: string;
  tags?: string[];
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
  user: User;
  description: string;
  likes: number;
  comments: number;
  shares: number;
}

export const courses: Course[] = [
    { id: 'course001', title: 'Introduction to Robotics with Arduino', description: 'A beginner-friendly course to get started with electronics and programming.', imageId: 'course-arduino' },
    { id: 'course002', title: 'Advanced Robotics with Raspberry Pi', description: 'Learn to build complex robots with computer vision and AI.', imageId: 'course-raspberry-pi' },
    { id: 'course003', title: '3D Printing for Robotics', description: 'Design and print custom parts for your robotic projects.', imageId: 'course-3d-printing' },
];

export const users: User[] = [
    { id: 'user001', name: 'TechieTom', imageId: 'user-avatar-1' },
    { id: 'user002', name: 'CircuitChloe', imageId: 'user-avatar-2' },
    { id: 'user003', name: 'RoboRachel', imageId: 'user-avatar-3' },
    { id: 'user004', name: 'GadgetGuru', imageId: 'user-avatar-4' },
    { id: 'user005', name: 'MakerMia', imageId: 'user-avatar-5' },
];

export const reels: Reel[] = [
    { id: 'reel001', user: users[0], description: 'My new robotic arm build in action! #robotics #diy', likes: 1256, comments: 42, shares: 12 },
    { id: 'reel002', user: users[1], description: 'Line follower robot racing! So much fun.', likes: 879, comments: 23, shares: 8 },
    { id: 'reel003', user: users[2], description: 'Unboxing the latest kit from RoboMart!', likes: 2401, comments: 112, shares: 54 },
    { id: 'reel004', user: users[3], description: 'My custom 3D printed drone is finally flying! #drone #3dprinting', likes: 3104, comments: 231, shares: 99 },
    { id: 'reel005', user: users[4], description: 'This little spider bot has some serious moves. #robotics', likes: 1843, comments: 88, shares: 35 },
    { id: 'reel006', user: users[0], description: 'Automated plant watering system. My plants have never been happier!', likes: 945, comments: 31, shares: 15 },
    { id: 'reel007', user: users[1], description: 'Just finished the self-balancing robot kit. This was a challenge!', likes: 1532, comments: 76, shares: 29 },
];

export const products: Product[] = [];

    