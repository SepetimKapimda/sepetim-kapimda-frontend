export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  unit?: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  image: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  unit: string;
}
