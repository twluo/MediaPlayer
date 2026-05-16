import { ref } from "vue";

// Module-level — survives navigation, resets only on full page reload.
const query = ref("");

export function useSearchState() {
  return { query };
}
