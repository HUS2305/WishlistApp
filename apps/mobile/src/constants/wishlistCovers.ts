/**
 * Wishlist Cover Images
 * 
 * This file maps wishlist cover image identifiers to their local asset paths.
 * When a user selects a cover image, we store the identifier (e.g., "christmas")
 * in the database, and use this mapping to display the actual image.
 */

export type WishlistCoverId = 
  | 'baby'
  | 'birthday'
  | 'books'
  | 'christmas'
  | 'cooking'
  | 'crafts'
  | 'fashion'
  | 'fitness'
  | 'home'
  | 'jewelry'
  | 'movies'
  | 'music'
  | 'outdoor'
  | 'pets'
  | 'tech'
  | 'toys'
  | 'travel';

export interface WishlistCover {
  id: WishlistCoverId;
  name: string;
  image: any; // React Native ImageSource
}

/**
 * Mapping of cover image identifiers to their display names and image sources
 */
export const WISHLIST_COVERS: Record<WishlistCoverId, WishlistCover> = {
  baby: {
    id: 'baby',
    name: 'Baby',
    image: require('../../assets/wishlist-covers/baby.png'),
  },
  birthday: {
    id: 'birthday',
    name: 'Birthday',
    image: require('../../assets/wishlist-covers/birthday.png'),
  },
  books: {
    id: 'books',
    name: 'Books',
    image: require('../../assets/wishlist-covers/books.png'),
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    image: require('../../assets/wishlist-covers/christmas.png'),
  },
  cooking: {
    id: 'cooking',
    name: 'Cooking',
    image: require('../../assets/wishlist-covers/cooking.png'),
  },
  crafts: {
    id: 'crafts',
    name: 'Arts & Crafts',
    image: require('../../assets/wishlist-covers/crafts.png'),
  },
  fashion: {
    id: 'fashion',
    name: 'Fashion',
    image: require('../../assets/wishlist-covers/fashion.png'),
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness',
    image: require('../../assets/wishlist-covers/fitness.png'),
  },
  home: {
    id: 'home',
    name: 'Home',
    image: require('../../assets/wishlist-covers/home.png'),
  },
  jewelry: {
    id: 'jewelry',
    name: 'Jewelry',
    image: require('../../assets/wishlist-covers/jewelry.png'),
  },
  movies: {
    id: 'movies',
    name: 'Movies',
    image: require('../../assets/wishlist-covers/movies.png'),
  },
  music: {
    id: 'music',
    name: 'Music',
    image: require('../../assets/wishlist-covers/music.png'),
  },
  outdoor: {
    id: 'outdoor',
    name: 'Outdoor',
    image: require('../../assets/wishlist-covers/outdoor.png'),
  },
  pets: {
    id: 'pets',
    name: 'Pets',
    image: require('../../assets/wishlist-covers/pets.png'),
  },
  tech: {
    id: 'tech',
    name: 'Tech',
    image: require('../../assets/wishlist-covers/tech.png'),
  },
  toys: {
    id: 'toys',
    name: 'Toys',
    image: require('../../assets/wishlist-covers/toys.png'),
  },
  travel: {
    id: 'travel',
    name: 'Travel',
    image: require('../../assets/wishlist-covers/travel.png'),
  },
};

/**
 * Array of all wishlist covers for easy iteration
 */
export const WISHLIST_COVERS_ARRAY: WishlistCover[] = Object.values(WISHLIST_COVERS);

/**
 * Get a wishlist cover by its identifier
 */
export function getWishlistCover(id: WishlistCoverId | string | null | undefined): WishlistCover | null {
  if (!id || typeof id !== 'string') {
    return null;
  }
  return WISHLIST_COVERS[id as WishlistCoverId] || null;
}

/**
 * Get the image source for a wishlist cover identifier
 * Returns null if the identifier is invalid or not found
 */
export function getWishlistCoverImage(id: WishlistCoverId | string | null | undefined): any {
  const cover = getWishlistCover(id);
  return cover?.image || null;
}
