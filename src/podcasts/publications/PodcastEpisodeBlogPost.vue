<template>
  <PublicationPanelComponent
    :icon="blogIcon"
    :icon-hover="blogIcon"
    plugin="podcastEpisodeToBlogPost"
  >
    <template v-slot:panel>
      <div class="blog-post-panel">
        <BlogsSelect v-model="blogId" />
        <div>
          <button
            :disabled="disabled"
            class="pure-button pure-button-primary publish-button"
            type="button"
            @click.prevent="publish()"
          >
            {{
              publishing
                ? t('publications.plugins.podcastEpisodeToBlogPost.creating')
                : t('publications.plugins.podcastEpisodeToBlogPost.create')
            }}
          </button>
        </div>
      </div>
    </template>
  </PublicationPanelComponent>
</template>
<script lang="ts" setup>
import blogIcon from '@/assets/images/publications/podcasts/publish-as-mogul-blog.png'
import PublicationPanelComponent from '@/publications/PublicationPanelComponent.vue'
import BlogsSelect from '@/blogs/BlogsSelect.vue'
import { computed, inject, ref } from 'vue'
import type { GetPublicationContextFunction, PublishAndAwaitFunction } from '@/publications/input'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// must match the backend PLUGIN_NAME (PodcastEpisodeBlogPostPublisherPlugin.PLUGIN_NAME)
const pluginName = 'podcastEpisodeToBlogPost'

const publishAndAwaitFunction = inject<PublishAndAwaitFunction>('publishAndAwait')!
const getPublicationContextFunction =
  inject<GetPublicationContextFunction>('getPublicationContext')!

// the blog the user picked from the dropdown; goes to the backend as context.blogId
const blogId = ref<number | null>(null)
const publishing = ref<boolean>(false)
const disabled = computed(() => blogId.value === null || publishing.value)

/**
 * the publish mutation returns as soon as the work is queued, so awaiting that alone
 * cleared `publishing` within milliseconds and the button went live again while the post
 * was still being written -- two clicks, two posts. wait for the publication itself to
 * finish instead.
 */
async function publish(): Promise<void> {
  if (blogId.value === null) return
  publishing.value = true
  try {
    const publicationContext = getPublicationContextFunction()
    // the backend plugin reads context.blogId to know which blog to post to; the
    // resulting post's path comes back as a publication outcome (no redirect here).
    const clientContext = { blogId: blogId.value }
    await publishAndAwaitFunction(
      publicationContext.type,
      publicationContext.publishableId,
      clientContext,
      pluginName
    )
  } finally {
    publishing.value = false
  }
}
</script>
<style scoped>
.blog-post-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gutter-space-half);
}
</style>
