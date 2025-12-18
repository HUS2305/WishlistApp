import { TextProps } from "react-native";
import { Text } from "./Text";

/**
 * Legacy component - now just re-exports React Native Text
 * which will use the default Playwrite CZ font from Text.defaultProps
 * 
 * Previously used Inter font, but now respects global font setting
 */
export function InterText({ style, ...props }: TextProps) {
  return (
    <Text
      style={style}
      {...props}
    />
  );
}

// Keep old export name for backwards compatibility
export const PoppinsText = InterText;

