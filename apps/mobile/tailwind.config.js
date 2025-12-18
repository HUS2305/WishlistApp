/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Default font - using Playwrite CZ to verify font changes work (distinctive handwriting style)
        sans: ["PlaywriteCZ_400Regular", "System"],
        // Inter font families
        inter: ["Inter_400Regular", "System"],
        // React Native doesn't support fontWeight with custom fonts
        // Use these font families instead of fontWeight
        medium: ["Inter_500Medium", "System"],
        semibold: ["Inter_600SemiBold", "System"],
        bold: ["Inter_700Bold", "System"],
        // Playwrite CZ font
        playwrite: ["PlaywriteCZ_400Regular", "System"],
        // Map font weights to font families for React Native
        "400": ["Inter_400Regular", "System"],
        "500": ["Inter_500Medium", "System"],
        "600": ["Inter_600SemiBold", "System"],
        "700": ["Inter_700Bold", "System"],
      },
      colors: {
        // shadcn/ui color system
        border: "rgb(226 232 240)",
        input: "rgb(226 232 240)",
        ring: "rgb(59 130 246)",
        background: "rgb(255 255 255)",
        foreground: "rgb(15 23 42)",
        primary: {
          DEFAULT: "rgb(74 144 226)",
          foreground: "rgb(248 250 252)",
        },
        secondary: {
          DEFAULT: "rgb(241 245 249)",
          foreground: "rgb(30 41 59)",
        },
        destructive: {
          DEFAULT: "rgb(239 68 68)",
          foreground: "rgb(248 250 252)",
        },
        muted: {
          DEFAULT: "rgb(241 245 249)",
          foreground: "rgb(100 116 139)",
        },
        accent: {
          DEFAULT: "rgb(241 245 249)",
          foreground: "rgb(30 41 59)",
        },
        popover: {
          DEFAULT: "rgb(255 255 255)",
          foreground: "rgb(15 23 42)",
        },
        card: {
          DEFAULT: "rgb(255 255 255)",
          foreground: "rgb(15 23 42)",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};

