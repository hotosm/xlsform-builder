<script setup lang="ts">
import { ref, watch } from 'vue';

withDefaults(
  defineProps<{
    label: string;
    confirmLabel: string;
    confirmVariant?: 'brand' | 'danger';
  }>(),
  { confirmVariant: 'danger' },
);
const emit = defineEmits<{ confirm: [] }>();

const open = defineModel<boolean>('open', { default: false });

const rendered = ref(open.value);
watch(open, (value) => {
  if (value) rendered.value = true;
});

function onAfterHide(event: Event): void {
  if (event.target !== event.currentTarget) return;
  open.value = false;
  rendered.value = false;
}

function confirm(): void {
  open.value = false;
  emit('confirm');
}
</script>

<template>
  <wa-dialog
    v-if="rendered"
    :open="open"
    :label="label"
    @click.stop
    @keydown.stop
    @wa-after-hide="onAfterHide"
  >
    <slot></slot>
    <div slot="footer" class="dialog-footer">
      <wa-button variant="neutral" @click="open = false">Cancel</wa-button>
      <wa-button :variant="confirmVariant" @click="confirm">{{ confirmLabel }}</wa-button>
    </div>
  </wa-dialog>
</template>

<style scoped lang="scss">
.dialog-footer {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;
  width: 100%;
}
</style>
