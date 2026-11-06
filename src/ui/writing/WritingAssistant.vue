<style scoped>
.writing-tools-panel {
  --writing-tools-panel-padding: calc(var(--gutter-space) / 3);
  --writing-tools-panel-icon-size: 20px;
}

/* every button in an open tools row gets bottom spacing so the row baseline aligns... */
.tools.active .writing-tools-button {
  margin-bottom: calc(1 * var(--writing-tools-panel-padding));
}

/* ...except the one that's currently expanded, which merges into the row below it */
.tools .writing-tools-button.active {
  background-color: var(--raised-color);
  opacity: 100%;
  margin-bottom: 0;
  padding-bottom: calc(2 * var(--writing-tools-panel-padding));
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.styles.active .writing-tools-button {
  background-color: var(--raised-color);
  opacity: 100%;
}

.styles .writing-tools-button {
  border-radius: 0;
}

.styles .writing-tools-button:first-of-type {
  border-top-left-radius: var(--button-radius);
  border-bottom-left-radius: var(--button-radius);
}

.styles .writing-tools-button:last-of-type {
  border-top-right-radius: var(--button-radius);
  border-bottom-right-radius: var(--button-radius);
}

.writing-tools-panel .styles {
  display: grid;
  grid-template-areas: ' friendly-button concise-button professional-button  ';
  grid-template-columns: auto auto auto;
}

.writing-tools-panel .styles.active .writing-tools-button {
  border-top-right-radius: 0;
}

.concise-button {
  grid-area: concise-button;
}

.friendly-button {
  grid-area: friendly-button;
}

.professional-button {
  grid-area: professional-button;
}

.revert-link {
  grid-area: revert-link;
}

.accept-link {
  grid-area: accept-link;
}

.writing-tools-panel .tools {
  display: grid;
  grid-template-areas:
    ' proofread-button rewrite-button ai-button '
    ' ai-panel         ai-panel       ai-panel   ';
  grid-template-columns: auto auto auto;
  grid-column-gap: calc(1 * var(--writing-tools-panel-padding));
}

.rewrite-button {
  grid-area: rewrite-button;
}

.ai-button {
  grid-area: ai-button;
}

.proofread-button {
  grid-area: proofread-button;
}

.writing-tools-panel .ai {
  /* spans the Proofread/Rewrite/AI columns of the tools grid, so its width is
     derived from the tabs rather than a forced size */
  grid-area: ai-panel;
  min-width: 0;
  display: grid;
  grid-row-gap: calc(1 * var(--writing-tools-panel-padding));
  /* a raised panel that connects up to the (raised, active) AI tab above it;
     flat top edge so the tab reads as sitting on a shelf, rounded bottom */
  background-color: var(--raised-color);
  padding: calc(1.5 * var(--writing-tools-panel-padding));
  border-radius: var(--button-radius);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.writing-tools-panel .ai textarea {
  width: 100%;
  resize: vertical;
}

.ai .generate-row {
  display: grid;
  grid-template-areas: ' generate . ';
  grid-template-columns: auto 1fr;
}

.generate-button {
  grid-area: generate;
}

.generate-button.disabled {
  opacity: 0.5;
  cursor: default;
}

.proposal-approval a {
  font-size: var(--font-size-sm);
}
</style>
<template>
  <InputWrapperChild>
    <template v-slot:panel>
      <div class="writing-tools-panel">
        <div v-if="!proposalApprovalRequired">
          <div :class="toolsClasses">
            <WritingAssistantButton
              class="proofread-button"
              :label="t('writingassistant.buttons.proofread')"
              @click="proofread"
            >
              <Icon alt="" highlight="hover" :icon-hover="proofreadAsset" :icon="proofreadAsset" />
            </WritingAssistantButton>
            <WritingAssistantButton
              :class="rewriteToolsClasses"
              :expanded="activeTool === 'rewrite'"
              :label="t('writingassistant.buttons.rewrite')"
              @click="toggleRewriteTools"
            >
              <Icon alt="" highlight="hover" :icon-hover="rewriteAsset" :icon="rewriteAsset" />
            </WritingAssistantButton>
            <WritingAssistantButton
              :class="aiToolsClasses"
              :expanded="activeTool === 'ai'"
              :label="t('writingassistant.buttons.generate-with-ai')"
              @click="toggleAiTools"
            >
              <Icon alt="" highlight="hover" :icon-hover="aiAsset" :icon="aiAsset" />
            </WritingAssistantButton>
            <div v-if="aiToolsVisible" class="ai">
              <textarea
                v-model="prompt"
                :disabled="generating"
                :placeholder="placeholder"
                :aria-label="placeholder"
                rows="3"
              />
              <div class="generate-row">
                <button
                  class="pure-button pure-button-primary"
                  type="submit"
                  @click.prevent="generate"
                >
                  {{
                    generating
                      ? t('writingassistant.buttons.generating')
                      : t('writingassistant.buttons.generate')
                  }}
                </button>
              </div>
            </div>
          </div>
          <div v-if="rewriteStylesVisible" :class="rewriteStylesClasses">
            <WritingAssistantButton
              class="friendly-button"
              :label="t('writingassistant.buttons.friendly')"
              @click="rewriteFriendly"
            >
              <img alt="" src="../../assets/images/icons/friendly.svg" />
            </WritingAssistantButton>

            <WritingAssistantButton
              class="concise-button"
              :label="t('writingassistant.buttons.concise')"
              @click="rewriteConcise"
            >
              <img alt="" src="../../assets/images/icons/concise.svg" />
            </WritingAssistantButton>

            <WritingAssistantButton
              class="professional-button"
              :label="t('writingassistant.buttons.professional')"
              @click="rewriteProfessional"
            >
              <img alt="" src="../../assets/images/icons/professional.svg" />
            </WritingAssistantButton>
          </div>
        </div>
        <div v-if="proposalApprovalRequired" class="proposal-approval">
          <a class="accept-link" href="#" @click.prevent="accept">{{ t('buttons.accept') }}</a> |
          <a class="revert-link" href="#" @click.prevent="revert">{{ t('buttons.revert') }}</a>
        </div>
      </div>
    </template>
    <template v-slot:icon>
      <Icon
        :alt="t('icons.writing-assistant')"
        highlight="rest"
        :icon="rewriteAsset"
        :icon-hover="rewriteAsset"
      />
    </template>
  </InputWrapperChild>
</template>
<script lang="ts" setup>
import proofreadAsset from '@/assets/images/icons/proofread.svg'

import rewriteAsset from '@/assets/images/icons/rewrite.svg'

import aiAsset from '@/assets/images/icons/ai.svg'

import { ai } from '@/services'
import InputWrapperChild from '@/ui/input/InputWrapperChild.vue'
import WritingAssistantButton from '@/ui/writing/WritingAssistantButton.vue'
import { computed, inject, ref } from 'vue'
import type {
  ReadValueFunction,
  SetInputDisabledFunction,
  UpdateValueFunction
} from '@/ui/input/input'
import Icon from '@/ui/Icon.vue'
import { useI18n } from 'vue-i18n'

const updateValue = inject<UpdateValueFunction>('updateInputValue')!
const readValue = inject<ReadValueFunction>('readInputValue')!
const setInputDisabled = inject<SetInputDisabledFunction>('setInputDisabled')!

async function withInputDisabled<T>(fn: () => Promise<T>): Promise<T> {
  setInputDisabled(true)
  try {
    return await fn()
  } finally {
    setInputDisabled(false)
  }
}

const previousModelValue = ref<string>('')
const proposalApprovalRequired = ref<boolean>(false)

// which expandable sub-row (if any) is open in the tools row
const activeTool = ref<'none' | 'rewrite' | 'ai'>('none')

// AI prompt sub-row state
const prompt = ref<string>('')
const generating = ref<boolean>(false)
const placeholder = computed(() => t('writingassistant.placeholder'))

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
const { t } = useI18n()

const rewriteStylesVisible = computed<boolean>(() => activeTool.value === 'rewrite')
const aiToolsVisible = computed<boolean>(() => activeTool.value === 'ai')

const toolsClasses = computed<string>(() =>
  activeTool.value === 'none' ? 'tools' : 'tools active'
)
const rewriteStylesClasses = computed<string>(() => 'styles active')
const rewriteToolsClasses = computed<string>(() =>
  activeTool.value === 'rewrite' ? 'rewrite-button active' : 'rewrite-button'
)
const aiToolsClasses = computed<string>(() =>
  activeTool.value === 'ai' ? 'ai-button active' : 'ai-button'
)

function reset() {
  proposalApprovalRequired.value = false
  activeTool.value = 'none'
  prompt.value = ''
  generating.value = false
}

function revert() {
  proposeUpdatedText(previousModelValue.value)
  reset()
}

function accept() {
  reset()
}

function proposeUpdatedText(updatedText: string) {
  previousModelValue.value = readValue()
  emit('update:modelValue', updatedText)
  proposalApprovalRequired.value = true
  updateValue(updatedText)
}

function toggleRewriteTools() {
  activeTool.value = activeTool.value === 'rewrite' ? 'none' : 'rewrite'
}

function toggleAiTools() {
  activeTool.value = activeTool.value === 'ai' ? 'none' : 'ai'
}

async function proofread() {
  const contents = readValue().trim()

  if (contents === '') return

  activeTool.value = 'none'

  await withInputDisabled(async () => {
    const proofread = await ai.chat(
      `Please proof read the text following the line made of "="'s. Return only the proofread text, and nothing else.
        ==========================================
        ${contents}
      `
    )
    proposeUpdatedText(proofread)
  })
}

async function rewriteProfessional() {
  if (readValue().trim() === '') return
  await withInputDisabled(async () => {
    const updated = await ai.chat(
      `Please rewrite the text following the line made of "="'s to sound more professional. Return only the new text, and nothing else.
        ==========================================
        ${readValue()}
      `
    )
    proposeUpdatedText(updated)
  })
}

async function rewriteConcise() {
  if (readValue().trim() === '') return
  await withInputDisabled(async () => {
    const updated = await ai.chat(
      `Please rewrite the text following the line made of "="'s to be more concise. Return only the new text, and nothing else.
        ==========================================
        ${readValue()}
      `
    )
    proposeUpdatedText(updated)
  })
}

async function rewriteFriendly() {
  if (readValue().trim() === '') return
  await withInputDisabled(async () => {
    const updated = await ai.chat(
      `Please rewrite the text following the line made of "="'s to be more friendly in tone. Return only the new text, and nothing else.
        ==========================================
        ${readValue()}
      `
    )
    proposeUpdatedText(updated)
  })
}

/**
 * Build a single prompt for the Ai service. When the text box already has
 * content we ask the model to transform it using the user's instruction;
 * when it's empty we ask the model to write something from scratch.
 */
function buildPrompt(instruction: string, existing: string): string {
  if (existing === '') {
    return `${instruction}

Return only the requested text, and nothing else.`
  }
  return `Follow the instruction below to rewrite or transform the text that appears after the line made of "="'s. Return only the resulting text, and nothing else.

Instruction: ${instruction}
==========================================
${existing}`
}

async function generate() {
  const instruction = prompt.value.trim()
  if (instruction === '' || generating.value) return

  generating.value = true
  await withInputDisabled(async () => {
    try {
      const result = await ai.chat(buildPrompt(instruction, readValue().trim()))
      proposeUpdatedText(result)
    } finally {
      generating.value = false
    }
  })
}
</script>
