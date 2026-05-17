import { ref } from "vue";

// Module-level — survives navigation, resets only on full page reload.
const query = ref("");
const isOpen = ref(false);

function open() {
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
  query.value = "";
}

export function useSearchState() {
  return { query, isOpen, open, close };
}
