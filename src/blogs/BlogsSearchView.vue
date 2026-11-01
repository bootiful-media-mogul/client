<template>
  <EntityViewDecorator watermark-image="segment-icon.png">
    <h1>
      {{ t('blogs.title') }}
    </h1>
    <div v-if="!editorVisible">
      <form class="pure-form">
        <fieldset>
          <div class="toolbar">
            <Icon :icon-hover="plusIconHighlight" :icon="plusIcon" @click="createBlog" />
          </div>
          <legend>{{ t('blogs.all', { user: mogulName }) }}</legend>
          <div v-for="blog in blogResults" v-bind:key="blog.id" class="row blogs-row">
            <div class="id-column">
              #<b>{{ blog.id }}</b>
            </div>
            <div class="created-column">
              {{ dateTimeToString(blog.created) }}
            </div>
            <div class="posts-column">
              <a href="#" @click.prevent="navigateToPostsPageForBlog(blog.id, $event)">{{
                t('blogs.posts')
              }}</a>
            </div>
            <div class="title-column">
              {{ blog.title }}
            </div>

            <div class="edit-column">
              <Icon
                :icon="editHighlightAsset"
                :icon-hover="editAsset"
                @click.prevent="editBlog(blog)"
              />
            </div>
            <div class="rss-column">
              <Icon
                :icon="rssHighlightAsset"
                :icon-hover="rssAsset"
                @click.prevent="openRssFeed(blog.id, podcastRssFeedUrl(blog))"
              />
            </div>
            <div class="delete-column">
              <Icon
                :disabled="blogResults.length <= 1"
                :icon="deleteHighlightAsset"
                :icon-hover="deleteAsset"
                @click.prevent="deleteBlog(blog)"
              />
            </div>
          </div>
        </fieldset>
      </form>
    </div>
    <div v-else>
      <BlogsEditor :blog="draftBlog!" @done="onEditorDone" />
    </div>
  </EntityViewDecorator>
</template>
<style scoped>
.id-column {
  font-weight: normal;
}

.id-column b {
  font-weight: bold;
  font-size: var(--font-size-base);
}

.rss-column {
  grid-area: rss-column;
}

.posts-column {
  grid-area: posts-column;
  padding-left: var(--gutter-space);
}

.created-column {
  grid-area: created-column;
  padding-left: var(--gutter-space);
}

.delete-column {
  grid-area: delete-column;
}

.edit-column {
  grid-area: edit-column;
}

.title-column {
  grid-area: title-column;
}

.blogs-row {
  padding-bottom: var(--gutter-space);
  grid-template-rows: minmax(var(--row-height), auto) auto;
  border-top: 1px solid black;
  display: grid;
  grid-column-gap: var(--gutter-space);
  grid-template-areas:
    'title-column title-column title-column title-column title-column title-column '
    'id-column edit-column delete-column rss-column posts-column created-column';
  grid-template-columns: var(--id-column) var(--icon-column) var(--icon-column) var(--icon-column) 8em auto;
}
</style>
<!--    <div v-if="!editorVisible">
      <form class="pure-form">
        <fieldset>
          <div class="toolbar">
            <Icon :icon-hover="plusIconHighlight" :icon="plusIcon" @click="createPodcast" />
          </div>

          <legend>{{ t('blogs.all', { user: mogulName }) }}</legend>

          <div v-for="podcast in all" v-bind:key="podcast.id" class="row podcasts-row">
            <div class="id-column">
              #<b>{{ podcast.id }}</b>
            </div>
            <div class="created-column">
              {{ dts(podcast.created) }}
            </div>
            <div class="episodes">
              <a
                class="podcasts-icon"
                href="#"
                @click.prevent="navigateToEpisodesPageForPodcast(podcast.id, $event)"
              >
                {{ t('podcasts.episodes') }}
              </a>
            </div>
            <div class="edit">
              <Icon
                :icon="editHighlightAsset"
                :icon-hover="editAsset"
                @click.prevent="editPodcast(podcast)"
              />
            </div>
            <div class="rss">
              <Icon
                :icon="rssHighlightAsset"
                :icon-hover="rssAsset"
                @click.prevent="openRssFeed(podcast.id, podcastRssFeedUrl(podcast))"
              />
            </div>
            <div class="delete">
              <Icon
                :disabled="all.length == 1"
                :icon="deleteHighlightAsset"
                :icon-hover="deleteAsset"
                @click.prevent="deletePodcast(podcast)"
              />
            </div>
            <div class="podcast-title">
              {{ podcast.title }}
            </div>
          </div>
        </fieldset>
      </form>
    </div>-->
<!--<div v-else>
  <PodcastsEditor :podcast="draftPodcast!" :podcast-id="draftPodcast!.id" />
</div>-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { onMounted, ref } from 'vue'
import { Blog, blogs, mogul, utils } from '@/services'
import { apiUrl } from '@/config'
import EntityViewDecorator from '@/ui/EntityViewDecorator.vue'
import plusIconHighlight from '@/assets/images/plus-icon-highlight.png'
import plusIcon from '@/assets/images/plus-icon.png'
import Icon from '@/ui/Icon.vue'
import { dateTimeToString } from '@/dates'
import editHighlightAsset from '@/assets/images/edit-highlight.png'
import editAsset from '@/assets/images/edit.png'
import deleteHighlightAsset from '@/assets/images/delete-highlight.png'
import deleteAsset from '@/assets/images/delete.png'
import rssHighlightAsset from '@/assets/images/rss-highlight.png'
import rssAsset from '@/assets/images/rss.png'
import BlogsEditor from '@/blogs/BlogsEditor.vue'
import router from '@/index'

const mogulId = ref<number>(0)
const blogResults = ref<Array<Blog>>([])
const mogulName = ref<string>('')
const { t } = useI18n()

const editorVisible = ref<boolean>(false)
const draftBlog = ref<Blog>()

async function editBlog(blog: Blog) {
  draftBlog.value = blog
  editorVisible.value = true
}

async function deleteBlog(blog: Blog) {
  const msg = t('confirm.deletion', { title: blog.title })

  if (!utils.confirmDeletion(msg)) {
    return
  }

  await blogs.deleteBlog(blog.id)
  await reset()
}

async function createBlog() {
  console.log('creating blog')
  const blog = await blogs.createBlog('', '')
  await editBlog(blog)
}

async function navigateToPostsPageForBlog(blogId: number, event: Event) {
  event.preventDefault()
  await router.push({
    name: 'blogs/posts',
    params: { blogId: blogId }
  })
}

function openRssFeed(blogId: number, url: string) {
  window.open(url, 'rssWindowForBlogNo' + blogId)
}

function podcastRssFeedUrl(blog: Blog) {
  const api = apiUrl()
  return api + '/public/feeds/moguls/' + mogulId.value + '/blogs/' + blog.id + '/posts.atom'
}

async function reset() {
  const user = await mogul.user()
  mogulId.value = user.id
  mogulName.value = user.givenName + ' ' + user.familyName
  blogResults.value = await blogs.blogs()
}

async function onEditorDone() {
  editorVisible.value = false
  await reset()
}

onMounted(async () => {
  await reset()
})
</script>
