<script setup lang="ts">
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption
} from '@headlessui/vue'

interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number
  options: Option[]
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '請選擇'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})

function handleSelect(value: string | number) {
  emit('update:modelValue', value)
}
</script>

<template>
  <Listbox v-slot="{ open }" :model-value="modelValue" @update:model-value="handleSelect">
    <div :class="['relative', open ? 'z-[9999]' : '']">
      <ListboxButton class="select-trigger">
        <span class="block truncate">
          {{ selectedOption?.label || placeholder }}
        </span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <Icon icon="mdi:chevron-down" class="h-5 w-5 text-text-muted" aria-hidden="true" />
        </span>
      </ListboxButton>

      <Transition
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions class="select-options">
          <ListboxOption
            v-for="option in options"
            :key="option.value"
            v-slot="{ active, selected }"
            :value="option.value"
            as="template"
          >
            <li
              :class="[
                'select-option',
                active ? 'bg-primary/10' : '',
                selected ? 'selected' : ''
              ]"
            >
              <span :class="['block truncate', selected ? 'font-medium' : 'font-normal']">
                {{ option.label }}
              </span>
              <span
                v-if="selected"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-primary"
              >
                <Icon icon="mdi:check" class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </Transition>
    </div>
  </Listbox>
</template>
