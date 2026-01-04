/**
 * Re-exports of scrollable components from @gorhom/bottom-sheet
 * 
 * Use these components instead of regular ScrollView, FlatList, etc. when inside a BottomSheet
 * for better gesture handling and performance.
 * 
 * @example
 * ```tsx
 * import { BottomSheetScrollView, BottomSheetFlatList, BottomSheetTextInput } from '@/components/BottomSheetScrollables';
 * 
 * <BottomSheet visible={visible} onClose={onClose}>
 *   <BottomSheetScrollView>
 *     <Text>Scrollable content</Text>
 *   </BottomSheetScrollView>
 * </BottomSheet>
 * ```
 */

export {
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetSectionList,
  BottomSheetVirtualizedList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";

