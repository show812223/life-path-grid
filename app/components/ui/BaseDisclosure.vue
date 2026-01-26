<script setup lang="ts">
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'

interface Props {
  defaultOpen?: boolean
}

withDefaults(defineProps<Props>(), {
  defaultOpen: false
})
</script>

<template>
  <Disclosure v-slot="{ open }" :default-open="defaultOpen">
    <DisclosureButton class="disclosure-button">
      <slot name="trigger" :open="open">
        <span>展開</span>
      </slot>
      <Icon
        icon="mdi:chevron-down"
        :class="['h-5 w-5 text-text-muted transition-transform duration-200', open ? 'rotate-180' : '']"
      />
    </DisclosureButton>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <DisclosurePanel class="disclosure-panel">
        <slot />
      </DisclosurePanel>
    </Transition>
  </Disclosure>
</template>
