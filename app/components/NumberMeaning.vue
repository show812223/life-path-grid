<script setup lang="ts">
import { NCard, NTag } from 'naive-ui'
import { getNumberMeaning } from '~/shared/constants/numberMeanings'

interface Props {
  number: number
}

const props = defineProps<Props>()

const meaning = computed(() => getNumberMeaning(props.number))
</script>

<template>
  <NCard class="number-meaning" :bordered="false" v-if="meaning">
    <div class="section-header">
      <Icon icon="mdi:book-open-page-variant" class="w-5 h-5 mr-2 text-primary" />
      <span class="section-title">主命數詳細解讀</span>
    </div>

    <div class="meaning-content">
      <p class="description">{{ meaning.description }}</p>

      <div class="traits-section">
        <div class="trait-group">
          <div class="trait-header">
            <Icon icon="mdi:star-check" class="w-4 h-4 mr-2 text-success" />
            <span>優勢特質</span>
          </div>
          <div class="trait-list">
            <NTag
              v-for="strength in meaning.strengths"
              :key="strength"
              type="success"
              size="small"
              class="m-1"
            >
              {{ strength }}
            </NTag>
          </div>
        </div>

        <div class="trait-group">
          <div class="trait-header">
            <Icon icon="mdi:alert-decagram" class="w-4 h-4 mr-2 text-warning" />
            <span>成長課題</span>
          </div>
          <div class="trait-list">
            <NTag
              v-for="challenge in meaning.challenges"
              :key="challenge"
              type="warning"
              size="small"
              class="m-1"
            >
              {{ challenge }}
            </NTag>
          </div>
        </div>

        <div class="trait-group" v-if="meaning.career">
          <div class="trait-header">
            <Icon icon="mdi:briefcase" class="w-4 h-4 mr-2 text-info" />
            <span>適合職業</span>
          </div>
          <div class="trait-list">
            <NTag
              v-for="item in meaning.career"
              :key="item"
              type="info"
              size="small"
              class="m-1"
            >
              {{ item }}
            </NTag>
          </div>
        </div>

        <div class="trait-group" v-if="meaning.relationship">
          <div class="trait-header">
            <Icon icon="mdi:heart" class="w-4 h-4 mr-2 text-error" />
            <span>感情特質</span>
          </div>
          <p class="relationship-text">{{ meaning.relationship }}</p>
        </div>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.number-meaning {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center mb-4;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.meaning-content .description {
  @apply text-text-primary leading-relaxed mb-5 text-base;
}

.traits-section {
  @apply grid gap-4;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.trait-group .trait-header {
  @apply flex items-center mb-3 font-medium text-text-primary;
}

.trait-group .trait-list {
  @apply flex flex-wrap;
}

.trait-group .relationship-text {
  @apply text-text-primary leading-relaxed text-sm;
}
</style>
