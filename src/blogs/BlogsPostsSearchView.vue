<!--
 this is meant to be the overall search view of the blog posts
-->
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { Blog, blogs, Post, ResultType } from '@/services'
import router from '@/index'
import { useI18n } from 'vue-i18n'
import Result from '@/search/Result.vue'
import EntityViewDecorator from '@/ui/EntityViewDecorator.vue'

import blogIcon from '@/assets/images/icons/rss.svg'
import Icon from '@/ui/Icon.vue'

import plusIcon from '@/assets/images/icons/plus.svg'

// Props
const props = defineProps<{ blogId: number }>()
const posts = ref<Post[]>([])
const currentBlog = ref<Blog>()
const selectedBlogId = ref(props.blogId)
const { t } = useI18n()

onMounted(async () => {
  await loadBlog()
})

const title = ref<string>('')

async function loadBlog() {
  const newBlogId = selectedBlogId.value
  currentBlog.value = await blogs.blogById(newBlogId)
  posts.value = await blogs.blogPostPreviewsByBlog(newBlogId)
  title.value = t('blogs.posts.posts-for', { title: currentBlog.value.title })
}

async function navigateToPostEditor(blogId: number, postId: number) {
  await router.push({
    name: 'blogs/posts/post',
    params: { blogId: blogId, postId: postId }
  })
}

const loadPost = async (p: Post) => {
  await navigateToPostEditor(props.blogId, p.id)
}

function context(post: Post) {
  const m = new Map<string, any>()
  m.set('blogId', selectedBlogId.value)
  m.set('postId', post.id)
  m.set('id', post.id)
  m.set('type', 'post')
  return m
}

async function newPost() {
  const post = await blogs.createPost(selectedBlogId.value, '', '', '')
  await loadPost(post)
}
</script>
<template>
  <EntityViewDecorator :watermark-image="blogIcon">
    <h1>
      {{ t('blogs.posts.title') }}
    </h1>
    <form class="pure-form">
      <fieldset>
        <legend>{{ t('blogs.posts.posts-for', { title: currentBlog?.title }) }}</legend>
        <div class="toolbar">
          <Icon highlight="hover" :icon-hover="plusIcon" :icon="plusIcon" @click="newPost()" />
        </div>
        <div v-for="post in posts" v-bind:key="post.id">
          <Result
            :context="context(post)"
            :type="ResultType.Post"
            :aggregate-id="currentBlog?.id"
            :created="post.created"
            :title="post.title"
            :id="post.id"
            :allow-deletion="true"
            @delete="loadBlog"
          />
        </div>
      </fieldset>
    </form>
  </EntityViewDecorator>
</template>
