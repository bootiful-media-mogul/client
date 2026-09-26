import './assets/base.css'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './index'
import VCalendar, { Calendar, DatePicker, setupCalendar } from 'v-calendar'
// import { setupCalendar } from 'v-calendar'

import 'v-calendar/style.css'

function formatNumberEnglish(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

// every Ayrshare plugin publishes to the same platforms, so they all share these labels
const ayrsharePlatforms = {
  gmb: {
    label: 'Google Business Profile',
    maxCharactersAllowed: formatNumberEnglish(1500)
  },
  facebook: { label: 'Facebook', maxCharactersAllowed: formatNumberEnglish(63206) },
  linkedin: { label: 'LinkedIn', maxCharactersAllowed: formatNumberEnglish(3000) },
  instagram: { label: 'Instagram', maxCharactersAllowed: formatNumberEnglish(2200) },
  telegram: { label: 'Telegram', maxCharactersAllowed: formatNumberEnglish(4096) },
  snapchat: { label: 'Snapchat', maxCharactersAllowed: formatNumberEnglish(80) },
  pinterest: { label: 'Pinterest', maxCharactersAllowed: formatNumberEnglish(500) },
  threads: { label: 'Threads', maxCharactersAllowed: formatNumberEnglish(25000) },
  youtube: { label: 'YouTube', maxCharactersAllowed: formatNumberEnglish(5000) },
  reddit: { label: 'Reddit', maxCharactersAllowed: formatNumberEnglish(40000) },
  bluesky: { label: 'Bluesky', maxCharactersAllowed: formatNumberEnglish(300) },
  tiktok: { label: 'TikTok', maxCharactersAllowed: formatNumberEnglish(2200) },
  twitter: {
    label: 'X (formerly known as Twitter)',
    maxCharactersAllowed: formatNumberEnglish(280)
  }
}

// i18n
const translations = {
  en: {
    labels: {
      'required-value': 'This is a required value!',
      ok: 'OK',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      create: 'Create',
      'optional-value': '(this is optional)'
    },

    hello: 'Hi, {mogul}',
    notes: {
      buttons: {
        save: 'Save'
      },
      'system-wide': { title: 'System Notes' },
      entity: { title: 'Notes for {entityName}' },
      done: 'Done',
      filters: { 'show-done': 'Show Finished notes' },
      new: { prompt: "{entityName}'s Notes" }
    },
    blogs: {
      done: 'Done',
      editing: 'Editing {title}',

      save: 'Save',
      'new-blog': {
        title: 'Title',
        description: 'Description',
        'rss-url': 'RSS URL'
      }
    },
    publications: {
      outcomes: {
        'error-message': 'see error message',
        'no-error-message': '(no error message given)',
        keys: {
          wordpress: 'Wordpress',
          podcastEpisodeToBlogPost: 'Blog Post',
          blogPostMarkdownFile: 'Blog Post Markdown File',
          blogPostAyrshare: 'Ayrshare (Blog Posts)',
          podcastEpisodeAyrshare: 'Ayrshare (Podcast Episodes)',
          mogulAyrshare: 'Ayrshare (Mogul)',
          mockPodcastEpisode: 'Mock',
          podbean: 'Podbean',
          gmb: 'Google Business Profile',
          audioFile: 'Audio File Download',
          facebook: 'Facebook',
          linkedin: 'LinkedIn',
          instagram: 'Instagram',
          telegram: 'Telegram',
          snapchat: 'Snapchat',
          pinterest: 'Pinterest',
          threads: 'Threads',
          youtube: 'YouTube',
          reddit: 'Reddit',
          bluesky: 'Bluesky',
          tiktok: 'TikTok',
          twitter: 'X (formerly known as Twitter)'
        }
      },
      plugins: {
        wordpress: {
          connected: 'Connected',
          connect: 'Connect to WordPress',
          disabled: 'You must first configure your WordPress instance in the Settings page.',
          title: 'Wordpress',
          tokenUri: 'WordPress API Token URI',
          authorizationUri: 'WordPress API Autorization URI',
          clientId: 'OAuth Client ID',
          siteId: 'WordPress Site ID',
          baseUrl: 'WordPress Site Base URL',
          clientSecret: 'OAuth Client Secret',
          publish: 'Publish',
          description: `Publish this post to your WordPress blog.`
        },
        blogPostMarkdownFile: {
          title: 'Publish a blog as a Markdown file',
          description: 'download a Markdown file for your post',
          download: 'Download',
          producing: 'Preparing the file…',
          ready: 'Your download is ready'
        },
        blogPostAyrshare: {
          title: 'Ayrshare (Blog Posts)',
          description:
            'Publish this post to your Ayrshare account for distribution to social media.',
          twitterOauth1ApiKey: 'Twitter OAuth 1 API Key',
          twitterOauth1ApiSecret: 'Twitter OAuth 1 API Secret',
          ayrshareKey: 'Ayrshare API Key',
          charactersOrLess: '{num} characters or less',
          platforms: ayrsharePlatforms,
          'combo-post': 'use the same copy for all enabled platforms'
        },
        podcastEpisodeAyrshare: {
          description:
            'Publish this post to your Ayrshare account for distribution to social media.',
          title: 'Ayrshare (Podcast Episodes)',
          twitterOauth1ApiKey: 'Twitter OAuth 1 API Key',
          twitterOauth1ApiSecret: 'Twitter OAuth 1 API Secret',
          ayrshareKey: 'Ayrshare API Key',
          charactersOrLess: '{num} characters or less',
          platforms: ayrsharePlatforms,
          'combo-post': 'use the same copy for all enabled platforms'
        },
        mogulAyrshare: {
          description:
            'Publish straight to your Ayrshare account for distribution to social media.',
          title: 'Ayrshare',
          twitterOauth1ApiKey: 'Twitter OAuth 1 API Key',
          twitterOauth1ApiSecret: 'Twitter OAuth 1 API Secret',
          ayrshareKey: 'Ayrshare API Key',
          charactersOrLess: '{num} characters or less',
          platforms: ayrsharePlatforms,
          'combo-post': 'use the same copy for all enabled platforms'
        },
        blogPost: {
          description: 'Publish the episode as a blog post'
        },
        publish: 'Publish',
        github: {
          title: 'GitHub',
          clientId: 'Client ID',
          clientSecret: 'Client Secret'
        },
        mockPodcastEpisode: {
          description: 'Kicks off the production process, and generates dummy data',
          title: 'Mock Podcast Episode'
        },
        podcastEpisodeToBlogPost: {
          blogId: 'Blog ID',
          create: 'Create Post',
          creating: 'Creating the post…',
          description: 'Publish as a Blog Post',
          title: 'Publish as a Blog Post'
        },
        audioFile: {
          title: 'Download Audio File',
          description: 'Download the finalized (produced) .mp3 file for the episode',
          download: 'Download',
          producing: 'Producing the episode…',
          ready: 'Your download is ready'
        },
        transcript: {
          title: 'Transcript',
          download: 'Download transcript'
        },
        podbean: {
          title: 'Podbean',
          clientId: 'Client ID',
          clientSecret: 'Client Secret',
          description:
            'Publish this episode to your Podbean.com account for syndication and ad integration.'
        }
      }
    },

    writingassistant: {
      buttons: {
        proofread: 'Proofread',
        rewrite: 'Rewrite',
        'generate-with-ai': 'Generate with AI',
        generate: 'Generate',
        generating: 'Generating',
        friendly: 'Friendly',
        concise: 'Concise',
        professional: 'Professional'
      },
      placeholder: 'Ask the AI to write or rewrite this text…',
      alt: {
        friendly: 'Friendly',
        concise: 'Concise',
        professional: 'Professional'
      }
    },
    search: {
      navigation: {
        episode: 'visit podcast episode'
      },
      'no-results': {
        prompt: 'There are no results.'
      },
      results: {
        title: 'Search Results',
        result: {
          view: 'view'
        },
        prompt: '{count} result(s) for your search "{term}"'
      },
      prompt: 'Enter a search term and press enter'
    },

    // notifications
    notifications: {
      'job-started-event': 'the job {key} has started',
      'job-stopped-event': 'the job {key} has finished',
      'blog-updated-event': `The blog "{context}" with ID #{key} has been updated`.trim(),
      'blog-created-event': `The blog "{context}" with ID #{key} has been created`.trim(),
      'ayrshare-publication-completion-event':
        'Publication to the Ayrshare social media platform has completed.',
      'setting-written-event': 'Plugin configuration has been updated.',
      'transcript-processed-event': 'Transcript for #{key} has been processed.',
      'transcript-completed-event': 'Transcript for #{key} has been completed.',
      'podcast-episode-render-finished-event':
        'Finished producing an episode of the podcast episode #{key} ',
      'podcast-episode-render-started-event': 'Producing an episode of the podcast episode #{key}',
      'publication-started-event': 'Publishing podcast episode with ID #{key} has started.',
      'publication-completed-event': 'Publishing podcast episode with ID #{key} has finished.',
      'podcast-episode-completed-event':
        'The podcast with ID #{key} is completed and ready for production',
      'podcast-created-event': `The podcast "{context}", with ID #{key}, has been created.`.trim(),
      'podcast-updated-event': `The podcast "{context}", with ID #{key}, has been updated.`.trim(),
      'podcast-deleted-event': `The podcast "{context}", with ID #{key}, has been deleted.`.trim()
    },

    // managed files
    'managedfiles.please-upload-a-file': '(please upload a file.)',
    'managedfiles.visible':
      'Is this file publicly visible and accessible? If so, its public URL will show up in the preview panel.',
    'managedfiles.delete': 'Delete this file',
    'managedfiles.preview': 'Preview this file',
    'managedfiles.upload': 'Upload a file',
    'managedfiles.uploaded': 'Has this file been uploaded?',
    'managedfiles.content-type': "This file's content type",
    'managedfiles.file-name': "This file's name",

    // markdown
    'markdown.add-link-prompt': 'Where do you want the link to go to?',
    'markdown.add-image-prompt': 'Provide a caption for the image',

    // selections
    'selections.podcasts': 'Select a Podcast',
    'selections.blogs': 'Select a Blog',
    'selections.params.podcastIndexerJob.podcastId': 'Podcast ID',
    'selections.params.helloWorldJob.name': 'Name',
    'selections.params.importMarkdownPostsJob.blogId': 'Blog ID',
    'selections.params.importMarkdownPostsJob.managedFileId': 'Archive File',

    // jobs
    'jobs.name.testHelloWorldJob': '"Hello World!"',
    'jobs.name.helloWorldJob': '"Hello World!"',
    'jobs.name.failingJob': 'Fail',
    'jobs.name.notesIndexerJob': 'Notes Indexer',
    'jobs.name.podcastIndexerJob': 'Podcast Indexer',
    'jobs.required': '(required)',
    'jobs.name.importMarkdownPostsJob': 'Import Markdown Posts',
    'jobs.required-context-attributes': 'Required Context Attributes: {attributes}',
    'jobs.launch': 'Launch {name}',
    'jobs.title': 'Jobs',
    'jobs.attributes': 'Attributes',
    'jobs.busy': 'running {name}',
    'jobs.done': '{name} has completed successfully.',
    'jobs.failed': '{name} failed.',

    // app
    'app.tabs.main': 'Main',
    'app.menu.home': 'Home',
    'app.menu.search': 'Search',
    'app.menu.settings': 'Settings',
    'app.menu.jobs': 'Jobs',
    'app.menu.test': 'Test',
    'app.menu.podcasts': 'Podcasts',
    'app.menu.blogs': 'Blogs',
    'app.menu.about': 'About',
    'app.made-with-love': ` Mogul, made with love ❤️ by {josh} (and with Spring 🍃) `,
    'app.panels.notes': 'Notes',
    'app.panels.transcripts': 'Transcripts',
    'app.panels.media-preview': 'Media Preview',
    'confirm.deletion': `Are you sure you want to delete "{title}"? 
    
This is NOT reversible! `,
    ok: 'OK',
    'transcripts.podcasts.episodes.segments': 'Podcast Episode Segment',
    transcripts: {
      text: 'Transcript for {key} #{id}',
      buttons: {
        accept: 'Accept',
        revert: 'Revert',
        refresh: 'Re-transcribe',
        cancel: 'Cancel',
        save: 'Save'
      }
    },
    buttons: {
      accept: 'Accept',
      revert: 'Revert',
      cancel: 'Cancel'
    },
    'about.title': 'About',
    // input wrappers
    'components.input.enter-a-value': 'Enter a value',
    'components.inputWrapper.character-count': '{count} character(s)',
    'components.inputWrapper.empty': '(empty)',
    // compositions
    'compositions.buttons.add-attachment': 'Add Attachment',
    // blogs
    'blogs.title': 'Blogs',
    'blogs.all': "{user}'s blogs",
    'panel.alt.open': 'Open',
    'panel.alt.minimize': 'Minimize',

    'popup.default-content': 'default panel content',
    'popup.close': 'Close',

    'managedfiles.alt.preview': 'A preview for managed file {id}',

    'diagnostics.server-time.server': 'server',
    'diagnostics.server-time.database': 'db',
    'diagnostics.server-time.browser': 'browser',

    'home.title': 'Home',
    'home.activity-feed': 'Here is your activity feed...',
    'home.publications': 'Publications',
    'home.history.title': 'Recent Days',
    'home.history.days': 'Days to show',
    'home.history.nothing': 'Nothing here yet.',

    'icon.alt.default': 'an image, #{image}',

    'inputWrapperMenu.default-content':
      'the buttons should go here otherwise this will look like crap!',

    'markdown.nothing-to-preview': '(nothing to preview)',

    'blogs.posts': 'Posts',
    'blogs.posts.title': 'Posts',
    'blogs.posts.post': 'Blog Post',
    'blogs.posts.editing': 'Editing Post #{id}: {title}',
    'blogs.posts.new-post': 'New Post',
    'blogs.posts.basics': 'Basics',
    'blogs.posts.post.title': 'Title',
    'blogs.posts.post.created': 'Created',
    'blogs.posts.post.description': 'Description',
    'blogs.posts.post.summary': 'Summary',
    'blogs.posts.post.rss-slug': 'RSS Slug',
    'blogs.posts.post.visible': 'Visible',
    'blogs.posts.post.not-visible': 'Not visible',
    'blogs.posts.buttons.save': 'Save',
    'blogs.posts.buttons.cancel': 'Cancel',
    'blogs.posts.buttons.summarize': 'Summarize',
    'blogs.posts.buttons.summarizing': 'Summarizing',
    'blogs.posts.publications': 'Publications',
    'blogs.posts.posts-for': 'Posts for "{title}"',
    // episodes

    'compositions.attachments.drag-and-drop-attachments':
      'Drag one of the attachments onto the text editor to include it inline.',

    'podcasts.done': 'Done',
    'podcasts.episodes.episode': 'Episode',
    'podcasts.episodes': 'Episodes',
    'podcasts.episodes.title': 'Episodes in "{title}"',
    'podcasts.episodes.publications': 'Publications',
    'podcasts.episodes.publications.publishing': 'Publishing...',
    'podcasts.episodes.publications.producing':
      'Producing the audio for this episode. Publishing will continue by itself once the render finishes.',
    'podcasts.episodes.publications.production-failed':
      "The audio for this episode couldn't be produced. Nothing was published.",
    'podcasts.episodes.basics': 'Basics',
    'podcasts.episodes.segments': 'Segments',
    'podcasts.episodes.segments.prompt':
      "(don't forget to normalize your audio clips to the same sample rate and bit depth!)",
    'podcasts.episodes.segments.number': 'Episode segment # {id}',
    'podcasts.episodes.episodes': 'Episodes for Podcast #{id} - "{title}"',
    'podcasts.episodes.new-episode': 'New Episode',
    'podcasts.episodes.buttons.publish': 'Publish',
    'podcasts.episodes.buttons.cancel': 'Cancel',
    'podcasts.episodes.episode.segments.number': 'Segment {order} ',
    'podcasts.episodes.episode.graphic': 'Graphic',
    'podcasts.episodes.buttons.add-segment': 'Add a New Segment',
    'podcasts.episodes.episode.reference': 'the episode titled: {title}',
    'podcasts.episodes.all': "{title}'s episodes",
    'podcasts.episodes.episode.editing': 'Editing {id} "{title}"',
    'podcasts.episodes.episode.edit': 'Episode Editor',
    'podcasts.episodes.buttons.save': 'Save',
    'podcasts.episodes.episode.description.ai-prompt':
      'Please help me make this podcast episode description fun and pithy.',
    'podcasts.episodes.episode.title.ai-prompt':
      'Please help me make this podcast episode title fun and pithy.',
    'podcasts.episodes.episode.description': 'Description',
    'podcasts.episodes.episode.title': 'Title',
    'podcasts.episodes.episode.created': 'Created',
    'podcasts.episodes.plugins.please-select-a-plugin': 'Select a plugin',

    // podcasts
    'podcasts.title': 'Podcasts',
    'podcasts.all': "{user}'s podcasts",
    'podcasts.new-podcast': 'New Podcast',
    'podcasts.new-podcast.title': 'Title',
    'podcasts.title.ai.prompt': `Please help me take the following podcast title and make it more pithy and exciting!`,
    'podcasts.save': 'Save',
    'podcasts.editing': 'Editing {podcast}',
    'podcasts.podcasts.delete': 'Delete',

    // settings
    'settings.title': 'Settings',
    'settings.save-button': 'Save configuration changes for {plugin}',
    'settings.no-configuration-for-plugin': 'No configuration settings for the {plugin} plugin'
  }
}

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: translations,
  legacy: false, // why is this defaulted to true?
  warnHtmlInMessage: 'off'
})

const app = createApp(App)

// v-calendar opens its date pickers on 'hover-focus' by default, which means a
// mousemove anywhere over the field is enough to throw the calendar over whatever is
// below it -- and tabbing past the field does it too. these sit in the middle of long
// edit forms, so that happens constantly and never on purpose. 'click' is the only
// visibility that needs to be asked for: click to open, click again (or outside, or
// escape) to close. typing into the field still works either way.
app.use(setupCalendar, {
  datePicker: {
    popover: {
      visibility: 'click'
    }
  }
})

// Use the components
app.component('VCalendar', Calendar)
app.component('VDatePicker', DatePicker)

app.use(i18n)
app.use(router)
app.use(createPinia())

app.mount('#app')
