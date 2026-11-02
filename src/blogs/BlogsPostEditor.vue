<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { ai, Blog, blogs, Composition, loadNotesForNotable, Post } from '@/services'
import EntityViewDecorator from '@/ui/EntityViewDecorator.vue'
import InputWrapper from '@/ui/input/InputWrapper.vue'
import InputTools from '@/ui/InputTools.vue'
import { dateTimeToString } from '@/dates'
import blogIcon from '@/assets/images/navbar/blogs-icon.png'
import CompositionComponent from '@/compositions/CompositionComponent.vue'
import PublicationsSectionComponent from '@/publications/PublicationsSectionComponent.vue'
import { useI18n } from 'vue-i18n'
import BlogPostMarkdownFile from '@/blogs/publications/BlogPostMarkdownFile.vue'
import Wordpress from '@/blogs/publications/Wordpress.vue'
import Ayrshare from '@/blogs/publications/Ayrshare.vue'
import InputWrapperChild from '@/ui/input/InputWrapperChild.vue'
import transcriptAsset from '@/assets/images/icons/transcript.svg'
import Icon from '@/ui/Icon.vue'
import privacy from '@/assets/images/privacy-preview-highlight.png'
import privacyHighlight from '@/assets/images/privacy-preview.png'

const { t } = useI18n()

// Props
const props = defineProps<{
  blogId: number
  postId: number
}>()

// State
const draftPost = ref<Post>({} as Post)
const blog = ref<Blog>()
const created = ref<string | number>(-1)
// bound to the date picker; null until a post is loaded
const createdDate = ref<Date | null>(null)
const summarizing = ref<boolean>(false)
const summarizingButtonText = ref<string>(t('blogs.posts.buttons.summarize'))
// Form fields
const title = ref('')
const description = ref('')
const summary = ref('')
const rssSlug = ref('')
const visible = ref(false)
const dirtyKey = ref('')
const descriptionComposition = ref<Composition>()

async function summarize() {
  summarizing.value = true
  summarizingButtonText.value = t('blogs.posts.buttons.summarizing')
  summary.value = await ai.chat(
    `
    derive a summary of the following blog post.
    do not include or refer to any embedded HTML markup like <IFRAME> elements when generating the summary.

    ===================================
    ${draftPost.value.content}`
  )
  summarizing.value = false
  summarizingButtonText.value = t('blogs.posts.buttons.summarize')
}

onMounted(async () => {
  blog.value = await blogs.blogById(props.blogId)
  if (props.postId) {
    await loadPostIntoEditor(props.postId)
  }
})

// Methods
const dts = (date: string | number): string | null => {
  return dateTimeToString(date)
}

const computeDirtyKey = (): string => {
  // the creation date is part of what Save persists, so editing it has to mark the
  // form dirty or the buttons stay disabled.
  const createdAt = createdDate.value ? createdDate.value.getTime() : ''
  return `${draftPost.value.id ? draftPost.value.id : ''}${title.value}:${description.value}:${
    summary.value
  }:${rssSlug.value}:${createdAt}`
}

const buttonsDisabled = computed(() => {
  if (!draftPost.value.id) {
    return true
  }
  return dirtyKey.value === computeDirtyKey()
})

const loadPostIntoEditor = async (postId: number) => {
  const post = await blogs.postById(postId)
  Object.assign(draftPost.value, post)
  title.value = post.title
  description.value = post.content
  summary.value = post.summary
  rssSlug.value = post.rssSlug ?? ''
  visible.value = post.visible
  created.value = post.created ?? -1
  createdDate.value = post.created ? new Date(post.created) : null
  dirtyKey.value = computeDirtyKey()
  descriptionComposition.value = post.descriptionComposition
  await loadNotesForNotable('post', postId, title.value)
}

const save = async () => {
  if (draftPost.value.id) {
    await blogs.updatePost(
      draftPost.value.id,
      title.value,
      description.value,
      summary.value,
      optionalValue(rssSlug.value),
      createdDate.value
    )
    await loadPostIntoEditor(draftPost.value.id)
  }
}

const toggleVisibility = async () => {
  const previous = visible.value
  const next = !previous
  visible.value = next
  if (!draftPost.value.id) {
    return
  }
  try {
    await blogs.setBlogPostVisibility(draftPost.value.id, next)
  } catch (e) {
    visible.value = previous
    throw e
  }
}

function optionalValue(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const cancel = async () => {
  if (draftPost.value.id) {
    await loadPostIntoEditor(draftPost.value.id)
  }
}
</script>

<template>
  <EntityViewDecorator :watermark-image="blogIcon">
    <h1>{{ t('blogs.posts.post') }}</h1>
    <form class="pure-form pure-form-stacked">
      <fieldset>
        <legend>
          <span v-if="title">
            {{ t('blogs.posts.editing', { id: draftPost.id, title: title }) }}
          </span>
          <span v-else> {{ t('blogs.posts.new-post') }} </span>
          <span v-if="draftPost.id"> ({{ dts(created) }}) </span>
        </legend>
        <div class="form-section">
          <div class="form-section-title">{{ t('blogs.posts.basics') }}</div>
          <div class="form-row">
            <label for="postTitle"> {{ t('blogs.posts.post.title') }} </label>
            <InputWrapper v-model="title">
              <input id="postTitle" v-model="title" required type="text" />
              <InputTools v-model="title" />
            </InputWrapper>
          </div>
          <div class="form-row">
            <label for="postDescription"> {{ t('blogs.posts.post.description') }} </label>
            <InputWrapper v-model="description">
              <textarea id="postDescription" v-model="description" required rows="10" />
              <CompositionComponent
                v-if="descriptionComposition"
                :composition-id="parseInt(descriptionComposition.id + '')"
              />
              <InputTools v-model="description" />
            </InputWrapper>
          </div>
          <div class="form-row">
            <label for="postSummary"> {{ t('blogs.posts.post.summary') }} </label>
            <InputWrapper v-model="summary">
              <textarea id="postSummary" v-model="summary" required rows="5" />

              <InputTools v-model="summary">
                <!--
                 i need to build a component or some logic here in this slot that updates the v-model
                 with the AI-derived summary from the blog post. could i do that here?
                 how do i get a panel and such so that it slots in?
                -->
                <InputWrapperChild>
                  <template v-slot:icon>
                    <Icon :icon="transcriptAsset" :icon-hover="transcriptAsset" />
                  </template>
                  <template v-slot:panel>
                    <button
                      :disabled="summarizing"
                      class="pure-button"
                      type="button"
                      @click.prevent="summarize"
                    >
                      {{ summarizingButtonText }}
                    </button>
                  </template>
                </InputWrapperChild>
              </InputTools>
            </InputWrapper>
          </div>
          <div class="form-row">
            <label for="postRssSlug"> {{ t('blogs.posts.post.rss-slug') }} </label>
            <input id="postRssSlug" v-model="rssSlug" type="text" />
          </div>
          <div v-if="draftPost.id" class="form-row">
            <label for="postCreated">{{ t('blogs.posts.post.created') }}</label>
            <VDatePicker id="postCreated" v-model="createdDate" mode="dateTime" is24hr>
              <template #default="{ inputValue, inputEvents }">
                <input :value="inputValue" type="text" v-on="inputEvents" />
              </template>
            </VDatePicker>
          </div>
          <div class="form-row">
            <label>{{ t('blogs.posts.post.visible') }}</label>
            <a class="visibility-toggle" href="#" @click.prevent="toggleVisibility">
              <Icon
                v-if="visible"
                :alt="t('blogs.posts.post.visible')"
                :icon-hover="privacy"
                :icon="privacy"
                class="icon"
                sticky
              />
              <Icon
                v-else
                :alt="t('blogs.posts.post.not-visible')"
                :icon-hover="privacyHighlight"
                :icon="privacyHighlight"
                class="icon"
                sticky
              />
            </a>
          </div>
          <div>
            <button
              :disabled="buttonsDisabled"
              class="pure-button pure-button-primary"
              type="submit"
              @click.prevent="save"
            >
              {{ t('blogs.posts.buttons.save') }}
            </button>
            <button
              :disabled="buttonsDisabled"
              class="pure-button pure-button-primary"
              type="submit"
              @click.prevent="cancel"
            >
              {{ t('blogs.posts.buttons.cancel') }}
            </button>
          </div>

          <!-- publications -->

          <div class="form-section-title">{{ t('blogs.posts.publications') }}</div>
          <div class="publish-menu">
            <PublicationsSectionComponent
              :disabled="false"
              :publishable="postId + ''"
              :type="'post'"
            >
              <BlogPostMarkdownFile />
              <Wordpress />
              <Ayrshare />
            </PublicationsSectionComponent>
          </div>
        </div>
      </fieldset>
    </form>
  </EntityViewDecorator>
</template>

<style scoped>
.visibility-toggle:hover {
  text-decoration: none;
}
</style>
