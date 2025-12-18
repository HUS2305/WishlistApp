import { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Alert } from "react-native";
import { router } from "expo-router";

interface ClipboardHookOptions {
  enabled?: boolean;
  onUrlDetected?: (url: string) => void;
}

/**
 * Hook to monitor clipboard for product URLs
 * Detects when user copies a product link and prompts to add it to a wishlist
 */
export function useClipboardMonitor(options: ClipboardHookOptions = {}) {
  const { enabled = true, onUrlDetected } = options;
  const [lastCheckedUrl, setLastCheckedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const checkClipboard = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        
        // Check if it's a URL
        if (text && text.startsWith("http") && text !== lastCheckedUrl) {
          setLastCheckedUrl(text);
          
          // Check if it looks like a product URL
          if (isProductUrl(text)) {
            handleProductUrl(text);
          }
        }
      } catch (error) {
        console.error("Clipboard check error:", error);
      }
    };

    // Check clipboard every 2 seconds
    const interval = setInterval(checkClipboard, 2000);

    // Also check immediately
    checkClipboard();

    return () => clearInterval(interval);
  }, [enabled, lastCheckedUrl]);

  const isProductUrl = (url: string): boolean => {
    // List of common shopping domains
    const shoppingDomains = [
      "amazon.",
      "ebay.",
      "walmart.",
      "target.",
      "bestbuy.",
      "etsy.",
      "aliexpress.",
      "shopify.",
      "shop",
      "/product",
      "/item",
      "/p/",
      "/dp/",
    ];

    return shoppingDomains.some((domain) => url.toLowerCase().includes(domain));
  };

  const handleProductUrl = (url: string) => {
    if (onUrlDetected) {
      onUrlDetected(url);
      return;
    }

    // Show alert to add to wishlist
    Alert.alert(
      "Product Link Detected",
      "Would you like to add this item to a wishlist?",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Add to Wishlist",
          onPress: () => {
            // TODO: Navigate to item add screen with pre-filled URL
            // For now, navigate to wishlist create screen
            router.push("/wishlist/create");
          },
        },
      ]
    );
  };

  return {
    checkClipboard: async () => {
      const text = await Clipboard.getStringAsync();
      if (text && isProductUrl(text)) {
        handleProductUrl(text);
      }
    },
  };
}

